#define MyAppName "Local Tunes"
#ifndef MyAppVersion
  #define MyAppVersion "1.0.1"
#endif
#define MyAppPublisher "lerma-dev"
#define MyAppURL "https://github.com/lerma-dev/local-tunes-desktop"
#define MyAppExeName "localtunes.exe"

[Setup]
; AppId se queda igual para todas las versiones de la aplicación, si se cambia, el desinstalador no funcionará correctamente
AppId=tech.lerma.localtunes
AppName={#MyAppName}
AppVersion={#MyAppVersion}
UninstallDisplayName={#MyAppName}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\{#MyAppName}
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes
LicenseFile=metadata\Licensia.rtf
InfoBeforeFile=metadata\Descripcion.rtf
InfoAfterFile=metadata\Post_Instalacion.rtf
SetupIconFile=metadata\favicon.ico
UninstallDisplayIcon={app}\favicon.ico
OutputDir=build\installer
OutputBaseFilename=LocalTunes-setup 
CloseApplications=yes
RestartApplications=yes
AppMutex=tech.lerma.localtunes.mutex.A1B2C3D4-E5F6
ChangesAssociations=yes
SolidCompression=yes
WizardStyle=modern dynamic

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[InstallDelete]
; Limpia web_assets antes de copiar la nueva para que no queden archivos de versiones anteriores
Type: filesandordirs; Name: "{app}\web_assets"

[Files]
Source: "metadata\favicon.ico"; DestDir: "{app}"; Flags: ignoreversion
; --- RUNTIME PARA 64 BITS (Solo se copia si Windows es x64) ---
Source: "build\v{#MyAppVersion}\win-x64\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion; Check: IsWin64
Source: "build\v{#MyAppVersion}\win-x64\WebView2Loader.dll"; DestDir: "{app}"; Flags: ignoreversion; Check: IsWin64
Source: "build\v{#MyAppVersion}\win-x64\e_sqlite3.dll"; DestDir: "{app}"; Flags: ignoreversion; Check: IsWin64
Source: "build\v{#MyAppVersion}\win-x64\runtimes\*"; DestDir: "{app}\runtimes"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: IsWin64
Source: "build\v{#MyAppVersion}\win-x64\web_assets\*"; DestDir: "{app}\web_assets"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: IsWin64

; --- RUNTIME PARA 32 BITS ---
Source: "build\v{#MyAppVersion}\win-x86\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion; Check: not IsWin64
Source: "build\v{#MyAppVersion}\win-x86\WebView2Loader.dll"; DestDir: "{app}"; Flags: ignoreversion; Check: not IsWin64
Source: "build\v{#MyAppVersion}\win-x86\e_sqlite3.dll"; DestDir: "{app}"; Flags: ignoreversion; Check: not IsWin64
Source: "build\v{#MyAppVersion}\win-x86\runtimes\*"; DestDir: "{app}\runtimes"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: not IsWin64
Source: "build\v{#MyAppVersion}\win-x86\web_assets\*"; DestDir: "{app}\web_assets"; Flags: ignoreversion recursesubdirs createallsubdirs; Check: not IsWin64

[Registry]
; --- ProgID de Local Tunes (necesario para "Abrir con") ---
Root: HKCU; Subkey: "Software\Classes\LocalTunes.Audio"; ValueType: string; ValueName: ""; ValueData: "Archivo de audio de Local Tunes"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\LocalTunes.Audio\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\favicon.ico"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\LocalTunes.Audio\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\localtunes.exe"" ""%1"""; Flags: uninsdeletevalue

; --- Solo "Abrir con" (NO cambia el predeterminado) ---
Root: HKCU; Subkey: "Software\Classes\.mp3\OpenWithProgids";  ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.m4a\OpenWithProgids";  ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.m4b\OpenWithProgids";  ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.aac\OpenWithProgids";  ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.wav\OpenWithProgids";  ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.ogg\OpenWithProgids";  ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.oga\OpenWithProgids";  ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.opus\OpenWithProgids";  ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.flac\OpenWithProgids"; ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.wma\OpenWithProgids";  ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.aiff\OpenWithProgids"; ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.aif\OpenWithProgids";  ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.ape\OpenWithProgids";  ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.alac\OpenWithProgids"; ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Classes\.wv\OpenWithProgids";   ValueType: string; ValueName: "LocalTunes.Audio"; ValueData: ""; Flags: uninsdeletevalue

; --- Para que aparezca en "Aplicaciones predeterminadas" ---
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe"; ValueType: string; ValueName: "FriendlyAppName"; ValueData: "Local Tunes"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".mp3";  ValueData: ""
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".m4a";  ValueData: ""
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".m4b";  ValueData: ""
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".aac";  ValueData: ""
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".wav";  ValueData: ""
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".ogg";  ValueData: ""
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".oga";  ValueData: ""
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".opus"; ValueData: ""
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".flac"; ValueData: ""
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".wma";  ValueData: ""
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".aiff"; ValueData: ""
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".aif";  ValueData: ""
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".ape";  ValueData: ""
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".alac"; ValueData: ""
Root: HKCU; Subkey: "Software\Classes\Applications\localtunes.exe\SupportedTypes"; ValueType: string; ValueName: ".wv";   ValueData: ""

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
// Función para validar si la ruta ya existe en el PATH antes de agregarla
function NeedsAddPath(Param: string): boolean;
var
  OrigPath: string;
begin
  if RegQueryStringValue(HKEY_CURRENT_USER, 'Environment', 'PATH', OrigPath) then
  begin
    Result := Pos(';' + Param + ';', ';' + OrigPath + ';') = 0;
  end else
    Result := True;
end;