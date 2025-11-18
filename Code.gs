const SHEET_ID = '1swwM4nYI4Icjz4DKeT3pW2sfU-6xlBIYAmvv8PFyoMA';
const RESERVATIONS_SHEET = 'Reservations';
const ITEMS_SHEET = 'List'; // feuille contenant la liste des objets
const CONFIG_SHEET = 'Config'; // feuille contenant vos coordonnées
const NOTIFY_EMAIL = 'rivollier.s@gmail.com'; // où recevoir les mails

function _reservationsSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(RESERVATIONS_SHEET);
  
  // Créer la feuille si elle n'existe pas
  if (!sheet) {
    sheet = ss.insertSheet(RESERVATIONS_SHEET);
    sheet.appendRow(['timestamp', 'item_id', 'item_label', 'name', 'email', 'payment_option', 'message']);
  }
  
  return sheet;
}

function _itemsSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ITEMS_SHEET);
  return sheet;
}

function _configSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(CONFIG_SHEET);
  
  // Créer la feuille si elle n'existe pas
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG_SHEET);
    // En-têtes dans la colonne A, valeurs dans la colonne B
    sheet.appendRow(['Paramètre', 'Valeur']);
    sheet.appendRow(['IBAN', 'FR00 0000 0000 0000 0000 0000 000']);
    sheet.appendRow(['Titulaire', 'Votre Nom']);
    sheet.appendRow(['Nom livraison', 'Prénom NOM']);
    sheet.appendRow(['Adresse livraison', '123 Rue Exemple']);
    sheet.appendRow(['Ville livraison', '75000 Paris']);
    sheet.appendRow(['Téléphone livraison', '06 12 34 56 78']);
    
    // Formater l'en-tête
    sheet.getRange('A1:B1').setFontWeight('bold').setBackground('#4A90E2').setFontColor('#FFFFFF');
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 400);
  }
  
  return sheet;
}

/**
 * Lit les coordonnées depuis la feuille Config
 */
function _getConfig() {
  const sheet = _configSheet();
  const data = sheet.getDataRange().getValues();
  
  const config = {};
  // Parcourir les lignes (ignorer l'en-tête)
  for (let i = 1; i < data.length; i++) {
    const key = data[i][0]; // Colonne A
    const value = data[i][1]; // Colonne B
    if (key) {
      config[key] = value || '';
    }
  }
  
  return {
    iban: config['IBAN'] || '',
    titulaire: config['Titulaire'] || '',
    nomLivraison: config['Nom livraison'] || '',
    adresseLivraison: config['Adresse livraison'] || '',
    villeLivraison: config['Ville livraison'] || '',
    telephoneLivraison: config['Téléphone livraison'] || ''
  };
}

// Fonction pour lire tous les objets de la feuille "list"
function _getItems() {
  const sheet = _itemsSheet();
  if (!sheet) {
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return []; // pas de données (juste l'en-tête ou rien)
  }
  
  const header = data.shift(); // retire l'en-tête
  const idxNom = header.findIndex(h => h && h.toLowerCase().includes('nom'));
  const idxPrix = header.findIndex(h => h && h.toLowerCase().includes('prix'));
  const idxLien = header.findIndex(h => h && h.toLowerCase().includes('lien'));
  const idxImage = header.findIndex(h => h && h.toLowerCase().includes('image'));
  
  const items = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const nom = row[idxNom] || '';
    if (!nom) continue; // ignore les lignes sans nom
    
    // Génère un ID unique basé sur la position (ligne) et le nom
    const id = _generateId(nom, i + 2); // +2 car on a retiré l'en-tête et les indices commencent à 1
    
    const item = {
      id: id,
      label: nom,
      prix: row[idxPrix] || '',
      url: row[idxLien] || '',
      image: row[idxImage] || ''
    };
    items.push(item);
  }
  
  return items;
}

// Génère un ID unique pour un objet
function _generateId(nom, rowNumber) {
  // Crée un ID simple basé sur le nom (en minuscules, sans accents, espaces remplacés par -)
  let id = nom.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlève les accents
    .replace(/[^a-z0-9]+/g, '-') // remplace les caractères spéciaux par -
    .replace(/^-+|-+$/g, ''); // enlève les - en début et fin
  
  // Limite la longueur et ajoute le numéro de ligne pour garantir l'unicité
  if (id.length > 30) {
    id = id.substring(0, 30);
  }
  
  return id + '-' + rowNumber;
}

// GET: renvoie la liste des objets disponibles et les IDs réservés
function doGet(e) {
  // Récupère les objets de la feuille "list"
  const items = _getItems();
  
  // Récupère les réservations
  const sheet = _reservationsSheet();
  const data = sheet.getDataRange().getValues();
  const header = data.shift(); // remove header row
  const idxItemId = header.indexOf('item_id');
  const idxItemLabel = header.indexOf('item_label');

  const taken = new Map();
  for (const row of data) {
    const id = row[idxItemId];
    const label = row[idxItemLabel];
    if (id) taken.set(id, label || '');
  }

  // Récupère les coordonnées depuis Config
  const config = _getConfig();
  
  return _jsonResponse({
    items: items,
    reserved_ids: Array.from(taken.keys()),
    config: config
  });
}

// POST: enregistre une réservation et envoie un email
function doPost(e) {
  try {
    const contentType = e.postData?.type || '';
    let payload = {};
    if (contentType.includes('application/json')) {
      payload = JSON.parse(e.postData.contents);
    } else {
      // compatibilité application/x-www-form-urlencoded
      const params = e.parameter;
      payload = {
        item_id: params.item_id,
        item_label: params.item_label,
        name: params.name,
        email: params.email,
        payment_option: params.payment_option,
        message: params.message,
        lang: params.lang || 'fr',
        item_price: params.item_price,
        item_url: params.item_url
      };
    }

    const { item_id, item_label, name, email, payment_option, message, lang, item_price, item_url } = payload;
    if (!item_id || !name || !email) {
      return _jsonResponse({ ok: false, error: 'item_id, name et email requis' }, 400);
    }

    // Vérifier si l'objet n'est pas déjà réservé (protection contre les doublons)
    const sheet = _reservationsSheet();
    const existingData = sheet.getDataRange().getValues();
    if (existingData.length > 1) { // Plus que juste l'en-tête
      const headerRow = existingData[0];
      const itemIdColIndex = headerRow.indexOf('item_id');
      
      // Chercher si cet item_id existe déjà
      for (let i = 1; i < existingData.length; i++) {
        if (existingData[i][itemIdColIndex] === item_id) {
          return _jsonResponse({ 
            ok: false, 
            error: 'already_reserved',
            item_label: item_label || item_id
          }, 409);
        }
      }
    }

    // Si pas réservé, enregistrer la réservation
    sheet.appendRow([
      new Date(),
      item_id,
      item_label || '',
      name,
      email,
      payment_option || '',
      message || ''
    ]);

    // Email de notification pour vous
    const paymentText = payment_option === 'virement' ? '🏦 Virement bancaire' : '📦 Commande directe';
    const subjectOwner = `Nouvelle réservation: ${item_label || item_id}`;
    const bodyOwner =
      `Objet: ${item_label || item_id}\n` +
      `Prénom: ${name}\n` +
      `Email: ${email}\n` +
      `Option choisie: ${paymentText}\n` +
      `Message: ${message || '(aucun)'}\n` +
      `Heure: ${new Date().toLocaleString()}`;

    MailApp.sendEmail(NOTIFY_EMAIL, subjectOwner, bodyOwner);
    
    // Email récapitulatif pour la personne qui réserve (multilingue)
    const guestEmail = _getGuestEmail(name, item_label || item_id, lang, item_price, item_url);
    
    try {
      MailApp.sendEmail(email, guestEmail.subject, guestEmail.body);
    } catch (err) {
      Logger.log('Erreur envoi email invité: ' + err);
    }

    return _jsonResponse({ ok: true });
  } catch (err) {
    return _jsonResponse({ ok: false, error: String(err) }, 500);
  }
}

function _jsonResponse(obj, code = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Génère l'email de confirmation dans la langue appropriée
 */
function _getGuestEmail(name, itemLabel, lang, itemPrice, itemUrl) {
  // Lire les coordonnées depuis la feuille Config
  const config = _getConfig();
  
  // Formater le prix avec € si nécessaire
  let formattedPrice = itemPrice || '';
  if (formattedPrice && !formattedPrice.includes('€')) {
    formattedPrice = formattedPrice + ' €';
  }
  
  // Préparer les infos du produit
  const priceInfo = formattedPrice ? `\n   💰 Prix indicatif : ${formattedPrice}` : '';
  const urlInfo = itemUrl ? `\n   🔗 Lien : ${itemUrl}` : '';
  
  const emails = {
    fr: {
      subject: `✅ Confirmation de réservation - ${itemLabel}`,
      body: 
        `Bonjour ${name},\n\n` +
        `Votre réservation pour "${itemLabel}" a bien été confirmée ! 🎉${priceInfo}${urlInfo}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💝 COMMENT PROCÉDER MAINTENANT ?\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Vous avez DEUX OPTIONS au choix :\n\n` +
        
        `🏦 OPTION 1 : JE COMMANDE POUR VOUS\n` +
        `   └─ Transférez-moi l'argent et je m'occupe de tout !\n\n` +
        `   💳 Coordonnées bancaires :\n` +
        `      IBAN : ${config.iban}\n` +
        `      Titulaire : ${config.titulaire}\n` +
        (formattedPrice ? `   💰 Montant : ${formattedPrice}\n` : '') +
        `   💡 Pensez à indiquer "${itemLabel}" dans le libellé\n\n` +
        
        `📦 OPTION 2 : VOUS COMMANDEZ DIRECTEMENT\n` +
        `   └─ Commandez sur le site et faites livrer ici :\n\n` +
        (itemUrl ? `   🔗 Lien du produit : ${itemUrl}\n\n` : '') +
        `   📍 Adresse de livraison :\n` +
        `      Nom : ${config.nomLivraison}\n` +
        `      Adresse : ${config.adresseLivraison}\n` +
        `      Ville : ${config.villeLivraison}\n` +
        `      Téléphone : ${config.telephoneLivraison}\n\n` +
        
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Merci beaucoup pour votre cadeau ! 💕\n\n` +
        `Belle journée,\n\n` +
        `Séverine et Ville <3`
    },
    fi: {
      subject: `✅ Varauksen vahvistus - ${itemLabel}`,
      body:
        `Hei ${name},\n\n` +
        `Varauksesi tuotteelle "${itemLabel}" on vahvistettu! 🎉${priceInfo}${urlInfo}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💝 MITEN EDETÄ NYT?\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Sinulla on KAKSI VAIHTOEHTOA:\n\n` +
        
        `🏦 VAIHTOEHTO 1: TILAAN PUOLESTASI\n` +
        `   └─ Lähetä minulle rahat niin hoidan kaiken!\n\n` +
        `   💳 Pankkitiedot:\n` +
        `      IBAN: ${config.iban}\n` +
        `      Tilinomistaja: ${config.titulaire}\n` +
        (formattedPrice ? `   💰 Summa: ${formattedPrice}\n` : '') +
        `   💡 Muista merkitä "${itemLabel}" viestikenttään\n\n` +
        
        `📦 VAIHTOEHTO 2: TILAAT SUORAAN\n` +
        `   └─ Tilaa sivustolta ja toimita tänne:\n\n` +
        (itemUrl ? `   🔗 Tuotteen linkki: ${itemUrl}\n\n` : '') +
        `   📍 Toimitusosoite:\n` +
        `      Nimi: ${config.nomLivraison}\n` +
        `      Osoite: ${config.adresseLivraison}\n` +
        `      Kaupunki: ${config.villeLivraison}\n` +
        `      Puhelin: ${config.telephoneLivraison}\n\n` +
        
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Kiitos paljon lahjastasi! 💕\n\n` +
        `Kaunista päivänjatkoa,\n\n` +
        `Séverine et Ville <3`
    },
    en: {
      subject: `✅ Reservation confirmed - ${itemLabel}`,
      body:
        `Hello ${name},\n\n` +
        `Your reservation for "${itemLabel}" has been confirmed! 🎉${priceInfo}${urlInfo}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💝 HOW TO PROCEED NOW?\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `You have TWO OPTIONS:\n\n` +
        
        `🏦 OPTION 1: I ORDER FOR YOU\n` +
        `   └─ Transfer me the money and I'll take care of everything!\n\n` +
        `   💳 Bank details:\n` +
        `      IBAN: ${config.iban}\n` +
        `      Account holder: ${config.titulaire}\n` +
        (formattedPrice ? `   💰 Amount: ${formattedPrice}\n` : '') +
        `   💡 Remember to include "${itemLabel}" in the reference\n\n` +
        
        `📦 OPTION 2: YOU ORDER DIRECTLY\n` +
        `   └─ Order from the website and ship here:\n\n` +
        (itemUrl ? `   🔗 Product link: ${itemUrl}\n\n` : '') +
        `   📍 Delivery address:\n` +
        `      Name: ${config.nomLivraison}\n` +
        `      Address: ${config.adresseLivraison}\n` +
        `      City: ${config.villeLivraison}\n` +
        `      Phone: ${config.telephoneLivraison}\n\n` +
        
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Thank you so much for your gift! 💕\n\n` +
        `Have a beautiful day,\n\n` +
        `Séverine et Ville <3`
    }
  };
  
  return emails[lang] || emails['fr']; // Français par défaut
}

// ═══════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════════

/**
 * Fonction pour réinitialiser toutes les réservations
 */
function resetAllReservations() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(RESERVATIONS_SHEET);
  if (sheet) {
    sheet.clear();
    sheet.appendRow(['timestamp', 'item_id', 'item_label', 'name', 'email', 'payment_option', 'message']);
    Logger.log('Toutes les réservations ont été effacées.');
  }
}

/**
 * Fonction pour initialiser ou réinitialiser la feuille Config
 * Lancez cette fonction manuellement depuis Apps Script si nécessaire
 */
function initializeConfig() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(CONFIG_SHEET);
  
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(CONFIG_SHEET);
  }
  
  // En-têtes et valeurs par défaut
  sheet.appendRow(['Paramètre', 'Valeur']);
  sheet.appendRow(['IBAN', 'FR00 0000 0000 0000 0000 0000 000']);
  sheet.appendRow(['Titulaire', 'Votre Nom']);
  sheet.appendRow(['Nom livraison', 'Prénom NOM']);
  sheet.appendRow(['Adresse livraison', '123 Rue Exemple']);
  sheet.appendRow(['Ville livraison', '75000 Paris']);
  sheet.appendRow(['Téléphone livraison', '06 12 34 56 78']);
  
  // Formater
  sheet.getRange('A1:B1').setFontWeight('bold').setBackground('#4A90E2').setFontColor('#FFFFFF');
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 400);
  
  Logger.log('Feuille Config initialisée avec succès !');
}
