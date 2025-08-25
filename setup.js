const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

const setupBot = async () => {
  console.log('🚀 Configuration du Bot E-commerce Telegram\n');

  try {
    // Créer le dossier data
    await fs.mkdir('data', { recursive: true });
    console.log('✅ Dossier data créé');

    // Demander les informations de base
    const botToken = await askQuestion('🤖 Token du bot Telegram: ');
    const adminId = await askQuestion('👤 ID Telegram admin (votre ID): ');
    const appName = await askQuestion('🌐 Nom de votre app (pour Render): ');

    // Créer le fichier .env
    const envContent = `# Configuration du Bot Telegram E-commerce
BOT_TOKEN=${botToken}
ADMIN_ID=${adminId}

# Configuration serveur
PORT=3000
NODE_ENV=production

# Webhook URL pour production
WEBHOOK_URL=https://${appName}.render.com/webhook/${botToken}

# Configuration locale
TIMEZONE=Europe/Paris
DEFAULT_LANGUAGE=fr
`;

    await fs.writeFile('.env', envContent);
    console.log('✅ Fichier .env créé');

    // Créer les données par défaut
    const categories = {
      electronics: { 
        name: '📱 Électronique', 
        description: 'Smartphones, ordinateurs, accessoires tech' 
      },
      clothing: { 
        name: '👕 Vêtements', 
        description: 'Mode homme et femme' 
      },
      accessories: { 
        name: '💎 Accessoires', 
        description: 'Bijoux, montres, sacs' 
      },
      home: { 
        name: '🏠 Maison', 
        description: 'Décoration, meubles, électroménager' 
      }
    };

    const products = {
      'prod_001': {
        id: 'prod_001',
        name: 'iPhone 15 Pro',
        category: 'electronics',
        price: 1199.99,
        description: 'Smartphone Apple dernière génération avec appareil photo professionnel',
        image: '📱',
        stock: 15,
        active: true,
        reviews: [],
        avgRating: 0
      },
      'prod_002': {
        id: 'prod_002',
        name: 'MacBook Air M2',
        category: 'electronics',
        price: 1299.99,
        description: 'Ordinateur portable ultra-léger avec puce M2',
        image: '💻',
        stock: 8,
        active: true,
        reviews: [],
        avgRating: 0
      },
      'prod_003': {
        id: 'prod_003',
        name: 'T-shirt Premium',
        category: 'clothing',
        price: 29.99,
        description: 'T-shirt 100% coton bio, coupe moderne',
        image: '👕',
        stock: 50,
        active: true,
        reviews: [],
        avgRating: 0
      },
      'prod_004': {
        id: 'prod_004',
        name: 'Montre Connectée',
        category: 'accessories',
        price: 299.99,
        description: 'Montre intelligente avec GPS et suivi santé',
        image: '⌚',
        stock: 25,
        active: true,
        reviews: [],
        avgRating: 0
      },
      'prod_005': {
        id: 'prod_005',
        name: 'Aspirateur Robot',
        category: 'home',
        price: 399.99,
        description: 'Aspirateur intelligent avec navigation laser',
        image: '🤖',
        stock: 12,
        active: true,
        reviews: [],
        avgRating: 0
      }
    };

    const stats = {
      totalUsers: 0,
      totalOrders: 0,
      totalRevenue: 0,
      topProducts: {}
    };

    // Sauvegarder les données
    await fs.writeFile('data/categories.json', JSON.stringify(categories, null, 2));
    await fs.writeFile('data/products.json', JSON.stringify(products, null, 2));
    await fs.writeFile('data/users.json', JSON.stringify({}, null, 2));
    await fs.writeFile('data/orders.json', JSON.stringify({}, null, 2));
    await fs.writeFile('data/stats.json', JSON.stringify(stats, null, 2));

    console.log('✅ Données par défaut créées');

    // Créer le README
    const readmeContent = `# Bot Telegram E-commerce

## 🚀 Démarrage rapide

1. **Installation des dépendances:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configuration:**
   - Le fichier \`.env\` a été créé automatiquement
   - Vérifiez les paramètres si nécessaire

3. **Test en local:**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Déploiement sur Render:**
   - Connectez votre repo GitHub
   - Variables d'environnement sont dans \`.env\`
   - URL webhook: \`https://${appName}.render.com/webhook/${botToken}\`

## 🛠️ Commandes Admin

- \`/admin_stats\` - Statistiques de base
- \`/admin_analytics\` - Analytics avancées
- \`/broadcast message\` - Message groupé
- \`/reply userId message\` - Répondre au support

## 📁 Structure des données

- \`data/categories.json\` - Catégories de produits
- \`data/products.json\` - Catalogue produits
- \`data/users.json\` - Données utilisateurs
- \`data/orders.json\` - Commandes
- \`data/stats.json\` - Statistiques

## 🔧 Gestion des produits

Éditez \`data/products.json\` pour ajouter/modifier des produits:

\`\`\`json
{
  "prod_xxx": {
    "name": "Nom du produit",
    "category": "electronics",
    "price": 99.99,
    "description": "Description détaillée",
    "image": "🎁",
    "stock": 10,
    "active": true
  }
}
\`\`\`

## ⚡ Fonctionnalités

✅ Catalogue produits avec catégories  
✅ Panier et gestion stock  
✅ Système de commandes  
✅ Paiement simulé (Stripe/PayPal)  
✅ Support client intégré  
✅ Admin dashboard  
✅ Analytics et statistiques  
✅ Multi-langues (FR/EN)  
✅ Système d'avis  
✅ Wishlist  
✅ Codes promo  
✅ Notifications personnalisées  

## 🌐 Déploiement

Le bot est prêt pour Render, Heroku ou tout service cloud supportant Node.js.
`;

    await fs.writeFile('README.md', readmeContent);
    console.log('✅ README.md créé');

    console.log('\n🎉 Configuration terminée avec succès!');
    console.log('\n📝 Étapes suivantes:');
    console.log('1. npm install');
    console.log('2. npm run dev (pour tester localement)');
    console.log('3. Déployer sur Render/Heroku avec les variables d\'environnement');
    console.log(`\n🔗 Webhook URL: https://${appName}.render.com/webhook/${botToken}`);

  } catch (error) {
    console.error('❌ Erreur pendant la configuration:', error);
  }

  rl.close();
};

setupBot();