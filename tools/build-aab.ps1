# Local Android release build (no Codemagic needed):  .\tools\build-aab.ps1
# Needs: Android Studio (ships JDK 21 + SDK). Keystore stays OUTSIDE the project.
param(
  [string]$Keystore = "$env:USERPROFILE\Documents\ordino-keys\sky_marble_upload.jks",
  [string]$Alias = "upload",
  [int]$VersionCode = 1
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

# JDK 21 from Android Studio, Android SDK from default location
$jbr = "C:\Program Files\Android\Android Studio\jbr"
if (Test-Path $jbr) { $env:JAVA_HOME = $jbr; $env:Path = "$jbr\bin;$env:Path" }
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
if (-not $env:ANDROID_HOME -and (Test-Path $sdk)) { $env:ANDROID_HOME = $sdk }
if (-not (Test-Path $Keystore)) { throw "Keystore bulunamadi: $Keystore" }
if (-not $env:JAVA_HOME) { throw "JAVA_HOME yok. Android Studio kurulu mu?" }
if (-not $env:ANDROID_HOME) { throw "Android SDK bulunamadi ($sdk). Android Studio'yu bir kez acip SDK'yi kurdurun." }
# gradle reads the SDK path from local.properties (git-ignored)
"sdk.dir=$($env:ANDROID_HOME -replace '\\','/')" | Set-Content -Encoding ascii "android\local.properties"

$pw = Read-Host "Keystore parolasi" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw))
$env:CM_KEYSTORE_PATH = $Keystore; $env:CM_KEYSTORE_PASSWORD = $plain; $env:CM_KEY_ALIAS = $Alias; $env:CM_KEY_PASSWORD = $plain

npm run build
npx cap sync android
Push-Location android
.\gradlew.bat bundleRelease "-PversionCode=$VersionCode"
$code = $LASTEXITCODE
Pop-Location
Remove-Item Env:CM_KEYSTORE_PASSWORD, Env:CM_KEY_PASSWORD -ErrorAction SilentlyContinue
if ($code -ne 0) { throw "Gradle hata verdi ($code)" }
$aab = Get-ChildItem "android\app\build\outputs\bundle\release\*.aab" | Select-Object -First 1
Write-Host "`nHAZIR: $($aab.FullName)  ($([math]::Round($aab.Length/1MB,1)) MB)" -ForegroundColor Green
