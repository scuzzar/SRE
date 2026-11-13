/**
 * Die Anwendungs-ID (Client) der App-Registrierung in Microsoft Entra. Sie ist nicht geheim.
 * Solange sie leer ist, bietet die App keinen Abgleich mit OneDrive an. Die Registrierung erlaubt nur
 * persönliche Konten und leitet nur nach https://scuzzar.github.io/SRE/ zurück.
 */
export const oneDriveClientId = '0b35c74f-767d-4bc7-90d1-8be0c8581bd7';

/** Nur persönliche Microsoft-Konten: Dort liegt das OneDrive des Spielers. */
export const oneDriveAuthority = 'https://login.microsoftonline.com/consumers';

/**
 * Die Adresse, die in der Registrierung als Umleitungs-URI (SPA) steht. Nur unter ihr bietet die App
 * OneDrive an: Unter jeder anderen (Entwicklung, Tests, Einzeldatei) schlüge die Anmeldung fehl.
 */
export const oneDriveRedirectUri = 'https://scuzzar.github.io/SRE/';
