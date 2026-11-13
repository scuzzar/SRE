/**
 * Die Anwendungs-ID (Client) der App-Registrierung in Microsoft Entra. Sie ist nicht geheim.
 * Solange sie leer ist, bietet die App keinen Abgleich mit OneDrive an.
 */
export const oneDriveClientId = '';

/** Nur persönliche Microsoft-Konten: Dort liegt das OneDrive des Spielers. */
export const oneDriveAuthority = 'https://login.microsoftonline.com/consumers';
