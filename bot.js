const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs').promises;
const path = require('path');
const express = require('express');
require('dotenv').config();

// Configuration du bot
const BOT_TOKEN = process.env.BOT_TOKEN || 'VOTRE_TOKEN_BOT_ICI';
const ADMIN_ID = process.env.ADMIN_ID; // Ne pas utiliser de valeur par défaut pour les IDs, car c'est spécifique à chaque compte
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

console.log('Valeur de BOT_TOKEN:', process.env.BOT_TOKEN);

// Initialisation du bot - MODIFICATION IMPORTANTE !
const bot = new TelegramBot(BOT_TOKEN);
const app = express();

// Structure des données
let products = {};
let categories = {};
let users = {};
let orders = {};
let stats = {
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    topProducts: {}
};

// Fichiers de données
const DATA_FILES = {
    products: 'data/products.json',
    categories: 'data/categories.json',
    users: 'data/users.json',
    orders: 'data/orders.json',
    stats: 'data/stats.json'
};

// Initialisation des données par défaut
const initializeDefaultData = async () => {
    try {
        await fs.mkdir('data', { recursive: true });
    } catch (err) {
        console.log('Dossier data déjà existant');
    }

    const defaultCategories = {
        electronics: { name: '📱 Électronique', description: 'Smartphones, ordinateurs, accessoires tech' },
        clothing: { name: '👕 Vêtements', description: 'Mode homme et femme' },
        accessories: { name: '💎 Accessoires', description: 'Bijoux, montres, sacs' },
        home: { name: '🏠 Maison', description: 'Décoration, meubles, électroménager' }
    };

    const defaultProducts = {
        'prod_001': {
            name: 'iPhone 15 Pro',
            category: 'electronics',
            price: 1199.99,
            description: 'Smartphone Apple dernière génération avec appareil photo professionnel',
            image: '📱',
            stock: 15,
            active: true
        },
        'prod_002': {
            name: 'MacBook Air M2',
            category: 'electronics',
            price: 1299.99,
            description: 'Ordinateur portable ultra-léger avec puce M2',
            image: '💻',
            stock: 8,
            active: true
        },
        'prod_003': {
            name: 'T-shirt Premium',
            category: 'clothing',
            price: 29.99,
            description: 'T-shirt 100% coton bio, coupe moderne',
            image: '👕',
            stock: 50,
            active: true
        },
        'prod_004': {
            name: 'Montre Connectée',
            category: 'accessories',
            price: 299.99,
            description: 'Montre intelligente avec GPS et suivi santé',
            image: '⌚',
            stock: 25,
            active: true
        },
        'prod_005': {
            name: 'Aspirateur Robot',
            category: 'home',
            price: 399.99,
            description: 'Aspirateur intelligent avec navigation laser',
            image: '🤖',
            stock: 12,
            active: true
        }
    };

    await saveData('categories', defaultCategories);
    await saveData('products', defaultProducts);
    await saveData('users', {});
    await saveData('orders', {});
    await saveData('stats', stats);
};

// Fonctions de gestion des données
const loadData = async (type) => {
    try {
        const data = await fs.readFile(DATA_FILES[type], 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log(`Fichier ${type} non trouvé, création des données par défaut`);
        return {};
    }
};

const saveData = async (type, data) => {
    try {
        await fs.writeFile(DATA_FILES[type], JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Erreur sauvegarde ${type}:`, error);
        return false;
    }
};

// Chargement des données au démarrage
const initializeBot = async () => {
    try {
        products = await loadData('products');
        categories = await loadData('categories');
        users = await loadData('users');
        orders = await loadData('orders');
        stats = await loadData('stats');

        if (Object.keys(products).length === 0) {
            await initializeDefaultData();
            products = await loadData('products');
            categories = await loadData('categories');
        }

        console.log('🤖 Bot initialisé avec succès!');
        console.log(`📦 ${Object.keys(products).length} produits chargés`);
        console.log(`📂 ${Object.keys(categories).length} catégories chargées`);
    } catch (error) {
        console.error('Erreur initialisation:', error);
    }
};

// Gestion des utilisateurs
const getUser = (userId) => {
    if (!users[userId]) {
        users[userId] = {
            id: userId,
            cart: {},
            orders: [],
            createdAt: new Date().toISOString(),
            language: 'fr'
        };
        stats.totalUsers++;
        saveData('users', users);
        saveData('stats', stats);
    }
    return users[userId];
};

// Messages et textes
const MESSAGES = {
    fr: {
        welcome: (name) => `🛍️ Bienvenue ${name} dans notre boutique en ligne!\n\nDécouvrez notre sélection de produits de qualité.`,
        mainMenu: '🏠 Menu Principal',
        catalog: '📚 Catalogue',
        cart: '🛒 Mon Panier',
        order: '📦 Commander',
        support: '💬 Assistance',
        account: '👤 Mon Compte',
        categories: '📂 Choisissez une catégorie:',
        emptyCart: '🛒 Votre panier est vide',
        cartTotal: (total) => `💰 Total: ${total}€`,
        productAdded: '✅ Produit ajouté au panier!',
        productRemoved: '❌ Produit retiré du panier!',
        outOfStock: '❌ Produit en rupture de stock',
        orderConfirmed: '✅ Commande confirmée!',
        paymentRequired: '💳 Procéder au paiement',
        orderHistory: '📋 Historique des commandes',
        backToMenu: '⬅️ Retour au menu',
        support_msg: '💬 Comment pouvons-nous vous aider?\n\n❓ Tapez votre question ou utilisez les options ci-dessous:',
        faq: '❓ FAQ',
        contactAdmin: '👨‍💼 Contacter un conseiller',
        thanks: '🙏 Merci pour votre confiance!'
    }
};

// Keyboards
const getMainKeyboard = () => ({
    reply_markup: {
        keyboard: [
            [{ text: MESSAGES.fr.catalog }, { text: MESSAGES.fr.cart }],
            [{ text: MESSAGES.fr.order }, { text: MESSAGES.fr.support }],
            [{ text: MESSAGES.fr.account }]
        ],
        resize_keyboard: true,
        persistent: true
    }
});

const getInlineKeyboard = (type, data = {}) => {
    const keyboards = {
        categories: {
            reply_markup: {
                inline_keyboard: [
                    ...Object.entries(categories).map(([id, cat]) => [
                        { text: cat.name, callback_data: `cat_${id}` }
                    ]),
                    [{ text: MESSAGES.fr.backToMenu, callback_data: 'main_menu' }]
                ]
            }
        },

        product: ({ productId }) => { // Correction: accepte un objet avec productId
            const product = products[productId];
            return {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '➕ Ajouter au panier', callback_data: `add_${productId}` },
                            { text: '➖ Retirer du panier', callback_data: `remove_${productId}` }
                        ],
                        [{ text: '⬅️ Retour catégorie', callback_data: `cat_${product.category}` }],
                        [{ text: MESSAGES.fr.backToMenu, callback_data: 'main_menu' }]
                    ]
                }
            };
        },

        cart: ({ hasItems }) => ({ // Correction: accepte un objet avec hasItems
            reply_markup: {
                inline_keyboard: [
                    ...(hasItems ? [[{ text: '💳 Passer commande', callback_data: 'checkout' }]] : []),
                    [{ text: '🗑️ Vider le panier', callback_data: 'clear_cart' }],
                    [{ text: MESSAGES.fr.backToMenu, callback_data: 'main_menu' }]
                ]
            }
        }),

        payment: ({ orderId }) => ({ // Correction: accepte un objet avec orderId
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💳 Payer avec Stripe', url: `https://checkout.stripe.com/demo` }],
                    [{ text: '🅿️ Payer avec PayPal', url: `https://paypal.com/demo` }],
                    [{ text: '✅ Confirmer le paiement', callback_data: `confirm_payment_${orderId}` }],
                    [{ text: MESSAGES.fr.backToMenu, callback_data: 'main_menu' }]
                ]
            }
        }),

        support: {
            reply_markup: {
                inline_keyboard: [
                    [{ text: MESSAGES.fr.faq, callback_data: 'faq' }],
                    [{ text: MESSAGES.fr.contactAdmin, callback_data: 'contact_admin' }],
                    [{ text: MESSAGES.fr.backToMenu, callback_data: 'main_menu' }]
                ]
            }
        }
    };

    // Correction: utilisation de la bonne syntaxe pour appeler les fonctions dans l'objet
    if (typeof keyboards[type] === 'function') {
        return keyboards[type](data);
    }
    return keyboards[type];
};

// Handlers des commandes
bot.onText(/\/start/, async (msg) => {
    const user = getUser(msg.from.id);
    const welcomeMsg = MESSAGES.fr.welcome(msg.from.first_name || 'Cher client');

    await bot.sendMessage(
        msg.chat.id,
        welcomeMsg,
        getMainKeyboard()
    );
});

// Handler pour les messages texte
bot.on('message', async (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
        const user = getUser(msg.from.id);

        switch (msg.text) {
            case MESSAGES.fr.catalog:
                await showCategories(msg.chat.id);
                break;

            case MESSAGES.fr.cart:
                await showCart(msg.chat.id, msg.from.id);
                break;

            case MESSAGES.fr.order:
                await showOrderHistory(msg.chat.id, msg.from.id);
                break;

            case MESSAGES.fr.support:
                await showSupport(msg.chat.id);
                break;

            case MESSAGES.fr.account:
                await showAccount(msg.chat.id, msg.from.id);
                break;

            default:
                await bot.sendMessage(msg.chat.id,
                    '🤖 Je transfère votre message à notre équipe support. Vous aurez une réponse rapidement!'
                );

                if (ADMIN_ID) {
                    await bot.sendMessage(ADMIN_ID,
                        `💬 Nouveau message support de ${msg.from.first_name} (@${msg.from.username}):\n\n"${msg.text}"\n\nRépondez avec /reply ${msg.from.id} votre_réponse`
                    );
                }
                break;
        }
    }
});

// Callbacks handlers
bot.on('callback_query', async (query) => {
    const userId = query.from.id;
    const chatId = query.message.chat.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id);

    if (data.startsWith('cat_')) {
        const categoryId = data.replace('cat_', '');
        await showProducts(chatId, categoryId);

    } else if (data.startsWith('prod_')) {
        const productId = data.replace('prod_', '');
        await showProduct(chatId, productId);

    } else if (data.startsWith('add_')) {
        const productId = data.replace('add_', '');
        await addToCart(chatId, userId, productId);

    } else if (data.startsWith('remove_')) {
        const productId = data.replace('remove_', '');
        await removeFromCart(chatId, userId, productId);

    } else if (data === 'checkout') {
        await processCheckout(chatId, userId);

    } else if (data.startsWith('confirm_payment_')) {
        const orderId = data.replace('confirm_payment_', '');
        await confirmPayment(chatId, userId, orderId);

    } else if (data === 'clear_cart') {
        await clearCart(chatId, userId);

    } else if (data === 'main_menu') {
        await showMainMenu(chatId);

    } else if (data === 'faq') {
        await showFAQ(chatId);

    } else if (data === 'contact_admin') {
        await bot.sendMessage(chatId,
            '👨‍💼 Un conseiller va vous contacter. Décrivez votre problème:'
        );
    }
});

// Fonctions d'affichage
const showCategories = async (chatId) => {
    await bot.sendMessage(
        chatId,
        MESSAGES.fr.categories,
        getInlineKeyboard('categories')
    );
};

const showProducts = async (chatId, categoryId) => {
    const category = categories[categoryId];
    if (!category) return;

    const categoryProducts = Object.entries(products).filter(
        ([id, product]) => product.category === categoryId && product.active
    );

    if (categoryProducts.length === 0) {
        await bot.sendMessage(chatId, `❌ Aucun produit disponible dans ${category.name}`);
        return;
    }

    let message = `${category.name}\n${category.description}\n\n`;

    const keyboard = [];

    categoryProducts.forEach(([id, product]) => {
        message += `${product.image} **${product.name}**\n`;
        message += `💰 ${product.price}€\n`;
        message += `📦 Stock: ${product.stock}\n`;
        message += `📝 ${product.description}\n\n`;

        keyboard.push([{ text: `🛒 ${product.name}`, callback_data: `prod_${id}` }]);
    });

    keyboard.push([{ text: '⬅️ Retour catégories', callback_data: 'main_menu' }]);

    await bot.sendMessage(chatId, message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
    });
};

const showProduct = async (chatId, productId) => {
    const product = products[productId];
    if (!product) return;

    const message = `${product.image} **${product.name}**\n\n` +
        `💰 Prix: ${product.price}€\n` +
        `📦 Stock disponible: ${product.stock}\n\n` +
        `📝 ${product.description}`;

    // Correction: passer l'ID du produit correctement
    await bot.sendMessage(
        chatId,
        message,
        {
            ...getInlineKeyboard('product', { productId }),
            parse_mode: 'Markdown'
        }
    );
};

const showCart = async (chatId, userId) => {
    const user = getUser(userId);
    const hasItems = Object.keys(user.cart).length > 0;

    if (!hasItems) {
        await bot.sendMessage(
            chatId,
            MESSAGES.fr.emptyCart,
            getInlineKeyboard('cart', { hasItems: false })
        );
        return;
    }

    let message = '🛒 **Votre Panier**\n\n';
    let total = 0;

    Object.entries(user.cart).forEach(([productId, quantity]) => {
        const product = products[productId];
        if (product) {
            const subtotal = product.price * quantity;
            total += subtotal;

            message += `${product.image} ${product.name}\n`;
            message += `   💰 ${product.price}€ × ${quantity} = ${subtotal.toFixed(2)}€\n\n`;
        }
    });

    message += `💰 **Total: ${total.toFixed(2)}€**`;

    await bot.sendMessage(
        chatId,
        message,
        {
            ...getInlineKeyboard('cart', { hasItems: true }),
            parse_mode: 'Markdown'
        }
    );
};

const addToCart = async (chatId, userId, productId) => {
    const user = getUser(userId);
    const product = products[productId];

    if (!product || product.stock <= 0) {
        await bot.sendMessage(chatId, MESSAGES.fr.outOfStock);
        return;
    }

    const currentQuantity = user.cart[productId] || 0;
    if (currentQuantity >= product.stock) {
        await bot.sendMessage(chatId, `⚠️ Stock limité à ${product.stock} unités`);
        return;
    }

    user.cart[productId] = currentQuantity + 1;
    await bot.sendMessage(chatId, MESSAGES.fr.productAdded);

    await saveData('users', users);
};

const removeFromCart = async (chatId, userId, productId) => {
    const user = getUser(userId);

    if (user.cart[productId] && user.cart[productId] > 0) {
        user.cart[productId]--;

        if (user.cart[productId] === 0) {
            delete user.cart[productId];
        }

        await bot.sendMessage(chatId, MESSAGES.fr.productRemoved);
        await saveData('users', users);
    }
};

const clearCart = async (chatId, userId) => {
    const user = getUser(userId);
    user.cart = {};
    await bot.sendMessage(chatId, '🗑️ Panier vidé!');
    await saveData('users', users);
};

const processCheckout = async (chatId, userId) => {
    const user = getUser(userId);

    if (Object.keys(user.cart).length === 0) {
        await bot.sendMessage(chatId, MESSAGES.fr.emptyCart);
        return;
    }

    // Créer la commande
    const orderId = `order_${Date.now()}_${userId}`;
    let total = 0;
    const orderItems = {};

    Object.entries(user.cart).forEach(([productId, quantity]) => {
        const product = products[productId];
        if (product) {
            orderItems[productId] = {
                name: product.name,
                price: product.price,
                quantity: quantity
            };
            total += product.price * quantity;
        }
    });

    orders[orderId] = {
        id: orderId,
        userId: userId,
        items: orderItems,
        total: total.toFixed(2),
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    await saveData('orders', orders);

    const message = `📦 **Commande ${orderId}**\n\n` +
        Object.values(orderItems).map(item =>
            `${item.name} × ${item.quantity} = ${(item.price * item.quantity).toFixed(2)}€`
        ).join('\n') +
        `\n\n💰 **Total: ${total.toFixed(2)}€**\n\n` +
        `🔒 Choisissez votre mode de paiement:`;

    // Correction: passer l'ID de la commande correctement
    await bot.sendMessage(
        chatId,
        message,
        {
            ...getInlineKeyboard('payment', { orderId }),
            parse_mode: 'Markdown'
        }
    );
};

const confirmPayment = async (chatId, userId, orderId) => {
    const order = orders[orderId];
    if (!order || order.status === 'paid') return; // Empêcher la double confirmation

    // Mettre à jour le stock
    Object.entries(order.items).forEach(([productId, item]) => {
        if (products[productId]) {
            products[productId].stock -= item.quantity;

            // Alerte stock bas
            if (products[productId].stock <= 5 && ADMIN_ID) {
                bot.sendMessage(ADMIN_ID,
                    `⚠️ ALERTE STOCK: ${products[productId].name} - Stock restant: ${products[productId].stock}`
                );
            }
        }
    });

    // Finaliser la commande
    order.status = 'paid';
    order.paidAt = new Date().toISOString();

    // Vider le panier
    const user = getUser(userId);
    user.cart = {};
    user.orders.push(orderId);

    // Mettre à jour les stats
    stats.totalOrders++;
    stats.totalRevenue += parseFloat(order.total);

    Object.keys(order.items).forEach(productId => {
        stats.topProducts[productId] = (stats.topProducts[productId] || 0) + order.items[productId].quantity;
    });

    // Sauvegarder
    await Promise.all([
        saveData('orders', orders),
        saveData('users', users),
        saveData('products', products),
        saveData('stats', stats)
    ]);

    // Messages de confirmation
    await bot.sendMessage(
        chatId,
        `✅ **Paiement confirmé!**\n\n` +
        `📦 Commande: ${orderId}\n` +
        `💰 Montant: ${order.total}€\n\n` +
        `🚚 Votre commande sera traitée dans les plus brefs délais.\n` +
        `📧 Vous recevrez un email de confirmation.`,
        { parse_mode: 'Markdown' }
    );

    // Notifier l'admin
    if (ADMIN_ID) {
        const adminMessage = `🛎️ **NOUVELLE COMMANDE**\n\n` +
            `👤 Client: ${userId}\n` +
            `📦 Commande: ${orderId}\n` +
            `💰 Total: ${order.total}€\n\n` +
            `📝 Détails:\n` +
            Object.values(order.items).map(item =>
                `• ${item.name} × ${item.quantity}`
            ).join('\n');

        await bot.sendMessage(ADMIN_ID, adminMessage, { parse_mode: 'Markdown' });
    }
};

const showOrderHistory = async (chatId, userId) => {
    const user = getUser(userId);

    if (user.orders.length === 0) {
        await bot.sendMessage(chatId, '📋 Aucune commande passée pour le moment.');
        return;
    }

    let message = '📋 **Historique des commandes**\n\n';

    user.orders.slice(-5).forEach(orderId => {
        const order = orders[orderId];
        if (order) {
            message += `📦 ${order.id}\n`;
            message += `📅 ${new Date(order.createdAt).toLocaleDateString('fr-FR')}\n`;
            message += `💰 ${order.total}€\n`;
            message += `📊 ${order.status === 'paid' ? '✅ Payée' : '⏳ En attente'}\n\n`;
        }
    });

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
};

const showAccount = async (chatId, userId) => {
    const user = getUser(userId);
    const userOrders = user.orders.length;
    const totalSpent = user.orders.reduce((sum, orderId) => {
        const order = orders[orderId];
        return sum + (order ? parseFloat(order.total) : 0);
    }, 0);

    const message = `👤 **Mon Compte**\n\n` +
        `🆔 ID: ${userId}\n` +
        `📅 Membre depuis: ${new Date(user.createdAt).toLocaleDateString('fr-FR')}\n` +
        `📦 Commandes passées: ${userOrders}\n` +
        `💰 Total dépensé: ${totalSpent.toFixed(2)}€\n` +
        `🛒 Articles dans le panier: ${Object.values(user.cart).reduce((a, b) => a + b, 0)}`;

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
};

const showSupport = async (chatId) => {
    await bot.sendMessage(
        chatId,
        MESSAGES.fr.support_msg,
        getInlineKeyboard('support')
    );
};

const showFAQ = async (chatId) => {
    const faqMessage = `❓ **Questions Fréquentes**\n\n` +
        `**Q: Comment passer une commande?**\n` +
        `R: Parcourez le catalogue, ajoutez au panier, puis cliquez sur "Commander".\n\n` +
        `**Q: Quels sont les modes de paiement?**\n` +
        `R: Nous acceptons Stripe et PayPal pour des paiements sécurisés.\n\n` +
        `**Q: Combien de temps pour la livraison?**\n` +
        `R: Livraison sous 2-5 jours ouvrés selon votre localisation.\n\n` +
        `**Q: Puis-je modifier ma commande?**\n` +
        `R: Contactez-nous rapidement après validation pour toute modification.`;

    await bot.sendMessage(chatId, faqMessage, { parse_mode: 'Markdown' });
};

const showMainMenu = async (chatId) => {
    await bot.sendMessage(
        chatId,
        MESSAGES.fr.mainMenu,
        getMainKeyboard()
    );
};

// Commandes admin
bot.onText(/\/admin_stats/, async (msg) => {
    if (msg.from.id.toString() !== ADMIN_ID) return;

    const topProductsText = Object.entries(stats.topProducts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, count]) => `• ${products[id]?.name || id}: ${count} ventes`)
        .join('\n');

    const message = `📊 **Statistiques Admin**\n\n` +
        `👥 Utilisateurs totaux: ${stats.totalUsers}\n` +
        `📦 Commandes totales: ${stats.totalOrders}\n` +
        `💰 Chiffre d'affaires: ${stats.totalRevenue.toFixed(2)}€\n\n` +
        `🏆 **Top Produits:**\n${topProductsText}`;

    await bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
});

bot.onText(/\/reply (\d+) (.+)/, async (msg, match) => {
    if (msg.from.id.toString() !== ADMIN_ID) return;

    const userId = match[1];
    const response = match[2];

    await bot.sendMessage(userId, `💬 **Réponse du support:**\n\n${response}`, { parse_mode: 'Markdown' });
    await bot.sendMessage(msg.chat.id, '✅ Réponse envoyée!');
});

// Promotion broadcast
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
    if (msg.from.id.toString() !== ADMIN_ID) return;

    const message = match[1];
    let sent = 0;

    for (const userId of Object.keys(users)) {
        try {
            await bot.sendMessage(userId, `📢 **Promotion spéciale:**\n\n${message}`, { parse_mode: 'Markdown' });
            sent++;
        } catch (error) {
            console.log(`Impossible d'envoyer à ${userId}`);
        }
    }

    await bot.sendMessage(msg.chat.id, `✅ Message envoyé à ${sent} utilisateurs`);
});

// Serveur Express pour webhook
app.use(express.json());

app.post(`/webhook/${BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

app.get('/', (req, res) => {
    res.send('🤖 Bot E-commerce Telegram opérationnel!');
});

// Gestion des erreurs globales
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Fonction de sauvegarde automatique
const autoSave = setInterval(async () => {
    try {
        await Promise.all([
            saveData('users', users),
            saveData('orders', orders),
            saveData('products', products),
            saveData('stats', stats)
        ]);
        console.log('💾 Sauvegarde automatique effectuée');
    } catch (error) {
        console.error('Erreur sauvegarde automatique:', error);
    }
}, 300000); // Sauvegarde toutes les 5 minutes

// Fonction de nettoyage au shutdown
const gracefulShutdown = async () => {
    console.log('🔄 Arrêt gracieux en cours...');
    clearInterval(autoSave);

    // Sauvegarder une dernière fois
    await Promise.all([
        saveData('users', users),
        saveData('orders', orders),
        saveData('products', products),
        saveData('stats', stats)
    ]);

    console.log('💾 Données sauvegardées');
    process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Initialisation et démarrage
const startBot = async () => {
    try {
        await initializeBot();

        if (process.env.NODE_ENV === 'production') {
            // Mode production : utiliser webhook
            const WEBHOOK_URL_FINAL = process.env.WEBHOOK_URL || `https://votre-app.render.com/webhook/${BOT_TOKEN}`;
            await bot.deleteWebHook(); // Supprime tout webhook existant
            await bot.setWebHook(WEBHOOK_URL_FINAL);
            app.listen(PORT, '0.0.0.0', () => {
                console.log(`🚀 Serveur démarré sur le port ${PORT}`);
                console.log(`🔗 Webhook configuré: ${WEBHOOK_URL_FINAL}`);
            });
        } else {
            // Mode développement : utiliser polling
            await bot.deleteWebHook(); // Assure que le webhook est désactivé
            bot.startPolling({
                timeout: 10,
                limit: 100,
                polling: true
            });
            console.log('🤖 Bot démarré en mode développement (polling)');
        }

        console.log('✅ Bot E-commerce Telegram opérationnel!');
    } catch (error) {
        console.error('❌ Erreur démarrage bot:', error);
        process.exit(1);
    }
};

// Démarrer le bot
startBot();