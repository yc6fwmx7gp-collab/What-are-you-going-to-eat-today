import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';

const db = new Database(':memory:');

db.exec(`
  CREATE TABLE IF NOT EXISTS dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    ingredients TEXT,
    steps TEXT,
    estimated_cooking_time TEXT,
    cuisine_type TEXT
  )
`);

const insertDish = db.prepare('INSERT INTO dishes (name, category, ingredients, steps, estimated_cooking_time, cuisine_type) VALUES (?, ?, ?, ?, ?, ?)');

const defaultDishes = [
  { name: 'Spaghetti Bolognese', category: 'Home-style', ingredients: ['Spaghetti', 'Ground Beef', 'Tomato Sauce', 'Onion', 'Garlic'], steps: ['Boil pasta until al dente.', 'Brown the ground beef with onion and garlic.', 'Stir in tomato sauce and simmer.', 'Serve sauce over pasta.'], estimated_cooking_time: '45 mins', cuisine_type: 'Italian' },
  { name: 'Chicken Stir-fry', category: 'Home-style', ingredients: ['Chicken breast', 'Broccoli', 'Soy sauce', 'Ginger', 'Garlic'], steps: ['Slice chicken into thin strips.', 'Stir fry chicken until cooked.', 'Add broccoli, ginger, and garlic.', 'Pour in soy sauce and toss well.'], estimated_cooking_time: '20 mins', cuisine_type: 'Chinese' },
  { name: 'Mac and Cheese', category: 'Home-style', ingredients: ['Macaroni', 'Cheddar Cheese', 'Milk', 'Butter', 'Flour'], steps: ['Boil macaroni.', 'Make a roux with butter and flour, then whisk in milk.', 'Melt cheese into the sauce.', 'Combine pasta and cheese sauce.'], estimated_cooking_time: '30 mins', cuisine_type: 'American' },
  { name: 'Lobster Thermidor', category: 'Luxury', ingredients: ['Lobster', 'Gruyere cheese', 'Mustard', 'White wine', 'Cream'], steps: ['Boil lobster and extract meat.', 'Make a creamy mustard and wine sauce.', 'Mix meat with sauce and place back in shell.', 'Top with Gruyere and bake until golden.'], estimated_cooking_time: '1 hour', cuisine_type: 'French' },
  { name: 'Truffle Risotto', category: 'Luxury', ingredients: ['Arborio rice', 'Truffle oil', 'Parmesan', 'Chicken broth', 'White wine'], steps: ['Toast rice in a pan.', 'Deglaze with white wine.', 'Gradually add warm broth while stirring continuously.', 'Finish with truffle oil and freshly grated Parmesan.'], estimated_cooking_time: '40 mins', cuisine_type: 'Italian' },
  { name: 'Beef Wellington', category: 'Luxury', ingredients: ['Beef tenderloin', 'Puff pastry', 'Mushroom duxelles', 'Prosciutto', 'Egg wash'], steps: ['Sear the beef tenderloin.', 'Wrap beef in prosciutto and mushroom duxelles.', 'Wrap everything in puff pastry.', 'Brush with egg wash and bake until golden brown.'], estimated_cooking_time: '2 hours', cuisine_type: 'British' },
  { name: 'Sushi Tacos', category: 'Creative/Innovative', ingredients: ['Seaweed (Nori)', 'Sushi rice', 'Spicy tuna', 'Avocado', 'Spicy mayo'], steps: ['Lightly fry seaweed into a taco shell shape.', 'Fill with seasoned sushi rice.', 'Top with spicy tuna and sliced avocado.', 'Drizzle with spicy mayo.'], estimated_cooking_time: '30 mins', cuisine_type: 'Japanese-Mexican Fusion' },
  { name: 'Matcha Tiramisu', category: 'Creative/Innovative', ingredients: ['Ladyfingers', 'Mascarpone cheese', 'Matcha powder', 'Heavy cream', 'Sugar'], steps: ['Whisk mascarpone, cream, and sugar until stiff.', 'Dip ladyfingers in a strong matcha tea solution.', 'Layer ladyfingers and mascarpone mixture.', 'Dust the top generously with matcha powder and chill.'], estimated_cooking_time: '4 hours (includes chilling)', cuisine_type: 'Japanese-Italian Fusion' },
  { name: 'Deconstructed Samosa', category: 'Creative/Innovative', ingredients: ['Potatoes', 'Peas', 'Crispy pastry flakes', 'Tamarind chutney', 'Mint chutney'], steps: ['Boil and mash potatoes with spices and peas.', 'Plate the potato mixture elegantly.', 'Scatter crispy pastry flakes over the top.', 'Drizzle with tamarind and mint chutneys.'], estimated_cooking_time: '45 mins', cuisine_type: 'Indian Fusion' },
];

for (const dish of defaultDishes) {
  insertDish.run(dish.name, dish.category, JSON.stringify(dish.ingredients), JSON.stringify(dish.steps), dish.estimated_cooking_time, dish.cuisine_type);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Limit JSON payload to 5MB to prevent memory exhaustion
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/dishes', (req, res) => {
    const dishes = db.prepare('SELECT * FROM dishes').all();
    res.json(dishes.map((d: any) => ({
      ...d,
      ingredients: d.ingredients ? JSON.parse(d.ingredients) : [],
      steps: d.steps ? JSON.parse(d.steps) : []
    })));
  });

  app.post('/api/dishes/upload', (req, res) => {
    const data = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Root node MUST be an array' });
    }

    let added = 0;
    const validCategories = ['Home-style', 'Luxury', 'Creative/Innovative'];

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        try {
          if (typeof item.name !== 'string' || !item.name.trim()) continue;
          if (!validCategories.includes(item.category)) continue;
          
          // OWASP-compliant sanitization to prevent DOM-based XSS
          const sanitize = (str: string) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          
          const name = sanitize(item.name.trim());
          const category = item.category;
          
          let ingredients = null;
          if (Array.isArray(item.ingredients)) {
            ingredients = JSON.stringify(item.ingredients.filter(i => typeof i === 'string').map(sanitize));
          }
          
          let steps = null;
          if (Array.isArray(item.steps)) {
            steps = JSON.stringify(item.steps.filter(s => typeof s === 'string').map(sanitize));
          }

          let estimated_cooking_time = null;
          if (typeof item.estimated_cooking_time === 'string' && item.estimated_cooking_time.trim()) {
            estimated_cooking_time = sanitize(item.estimated_cooking_time.trim());
          }

          let cuisine_type = null;
          if (typeof item.cuisine_type === 'string' && item.cuisine_type.trim()) {
            cuisine_type = sanitize(item.cuisine_type.trim());
          }

          insertDish.run(name, category, ingredients, steps, estimated_cooking_time, cuisine_type);
          added++;
        } catch (e) {
          // Silently drop invalid items to ensure fault tolerance
        }
      }
    });

    insertMany(data);
    res.json({ message: `Successfully added ${added} dishes to the pool.` });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
