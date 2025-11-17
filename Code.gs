const SHEET_ID = '1swwM4nYI4Icjz4DKeT3pW2sfU-6xlBIYAmvv8PFyoMA';
const RESERVATIONS_SHEET = 'Reservations';
const ITEMS_SHEET = 'List'; // feuille contenant la liste des objets
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

  return _jsonResponse({
    items: items,
    reserved_ids: Array.from(taken.keys())
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
        lang: params.lang || 'fr'
      };
    }

    const { item_id, item_label, name, email, payment_option, message, lang } = payload;
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
    const guestEmail = _getGuestEmail(name, item_label || item_id, lang);
    
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
function _getGuestEmail(name, itemLabel, lang) {
  const emails = {
    fr: {
      subject: `✅ Confirmation de réservation - ${itemLabel}`,
      body: 
        `Bonjour ${name},\n\n` +
        `Votre réservation pour "${itemLabel}" a bien été confirmée ! 🎉\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💝 COMMENT PROCÉDER MAINTENANT ?\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Vous avez DEUX OPTIONS au choix :\n\n` +
        
        `🏦 OPTION 1 : JE COMMANDE POUR VOUS\n` +
        `   └─ Transférez-moi l'argent et je m'occupe de tout !\n\n` +
        `   💳 Coordonnées bancaires :\n` +
        `      IBAN : FR00 0000 0000 0000 0000 0000 000\n` +
        `      Titulaire : Votre Nom\n` +
        `   💡 Pensez à indiquer "${itemLabel}" dans le libellé\n\n` +
        
        `📦 OPTION 2 : VOUS COMMANDEZ DIRECTEMENT\n` +
        `   └─ Commandez sur le site et faites livrer ici :\n\n` +
        `   📍 Adresse de livraison :\n` +
        `      Nom : Prénom NOM\n` +
        `      Adresse : 123 Rue Exemple\n` +
        `      Ville : 75000 Paris\n` +
        `      Téléphone : 06 12 34 56 78\n\n` +
        
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Merci beaucoup pour votre cadeau ! 💕\n\n` +
        `Belle journée,\n\n` +
        `Séverine et Ville <3`
    },
    fi: {
      subject: `✅ Varauksen vahvistus - ${itemLabel}`,
      body:
        `Hei ${name},\n\n` +
        `Varauksesi tuotteelle "${itemLabel}" on vahvistettu! 🎉\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💝 MITEN EDETÄ NYT?\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Sinulla on KAKSI VAIHTOEHTOA:\n\n` +
        
        `🏦 VAIHTOEHTO 1: TILAAN PUOLESTASI\n` +
        `   └─ Lähetä minulle rahat niin hoidan kaiken!\n\n` +
        `   💳 Pankkitiedot:\n` +
        `      IBAN: FR00 0000 0000 0000 0000 0000 000\n` +
        `      Tilinomistaja: Votre Nom\n` +
        `   💡 Muista merkitä "${itemLabel}" viestikenttään\n\n` +
        
        `📦 VAIHTOEHTO 2: TILAAT SUORAAN\n` +
        `   └─ Tilaa sivustolta ja toimita tänne:\n\n` +
        `   📍 Toimitusosoite:\n` +
        `      Nimi: Prénom NOM\n` +
        `      Osoite: 123 Rue Exemple\n` +
        `      Kaupunki: 75000 Paris\n` +
        `      Puhelin: 06 12 34 56 78\n\n` +
        
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Kiitos paljon lahjastasi! 💕\n\n` +
        `Kaunista päivänjatkoa,\n\n` +
        `Séverine et Ville <3`
    },
    en: {
      subject: `✅ Reservation confirmed - ${itemLabel}`,
      body:
        `Hello ${name},\n\n` +
        `Your reservation for "${itemLabel}" has been confirmed! 🎉\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💝 HOW TO PROCEED NOW?\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `You have TWO OPTIONS:\n\n` +
        
        `🏦 OPTION 1: I ORDER FOR YOU\n` +
        `   └─ Transfer me the money and I'll take care of everything!\n\n` +
        `   💳 Bank details:\n` +
        `      IBAN: FR00 0000 0000 0000 0000 0000 000\n` +
        `      Account holder: Votre Nom\n` +
        `   💡 Remember to include "${itemLabel}" in the reference\n\n` +
        
        `📦 OPTION 2: YOU ORDER DIRECTLY\n` +
        `   └─ Order from the website and ship here:\n\n` +
        `   📍 Delivery address:\n` +
        `      Name: Prénom NOM\n` +
        `      Address: 123 Rue Exemple\n` +
        `      City: 75000 Paris\n` +
        `      Phone: 06 12 34 56 78\n\n` +
        
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
