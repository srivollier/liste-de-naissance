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
    sheet.appendRow(['timestamp', 'item_id', 'item_label', 'name', 'message']);
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
      url: row[idxLien] || ''
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
        message: params.message
      };
    }

    const { item_id, item_label, name, message } = payload;
    if (!item_id || !name) {
      return _jsonResponse({ ok: false, error: 'item_id et name requis' }, 400);
    }

    // écriture
    const sheet = _reservationsSheet();
    sheet.appendRow([
      new Date(),
      item_id,
      item_label || '',
      name,
      message || ''
    ]);

    // email de notif
    const subject = `Nouvelle réservation: ${item_label || item_id}`;
    const body =
      `Objet: ${item_label || item_id}\n` +
      `Prénom: ${name}\n` +
      `Message: ${message || '(aucun)'}\n` +
      `Heure: ${new Date().toLocaleString()}`;

    MailApp.sendEmail(NOTIFY_EMAIL, subject, body);

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
    sheet.appendRow(['timestamp', 'item_id', 'item_label', 'name', 'message']);
    Logger.log('Toutes les réservations ont été effacées.');
  }
}
