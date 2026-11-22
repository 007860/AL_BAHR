import 'package:material_ui/material_ui.dart';

/// Official HORIZON ONE / AL-BAHR HORIZON Design Tokens (Blueprint Sec. 19, 27 & Reference UI).
class BrandTokens {
  BrandTokens._();

  static const Color navy = Color(0xFF0A192F);
  static const Color navyLight = Color(0xFF132744);
  static const Color gold = Color(0xFFD9AD32);
  static const Color goldSoft = Color(0xFFFBF5E4);
  static const Color teal = Color(0xFF0A8C98); // Loading accent & category tile
  static const Color deepTeal = Color(0xFF0B6E73); // Hotels / Tours tile from reference
  static const Color background = Color(0xFFF6F8FB);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color textPrimary = Color(0xFF152238);
  static const Color textMuted = Color(0xFF52627A);
  static const Color border = Color(0xFFDDE4EC);

  static const Color successBg = Color(0xFFE7F6EC);
  static const Color successText = Color(0xFF146C2E);
  static const Color warnBg = Color(0xFFFFF6DB);
  static const Color warnText = Color(0xFF7A5600);
  static const Color errorBg = Color(0xFFFDECEC);
  static const Color errorText = Color(0xFFA61B1B);

  static ThemeData lightTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: background,
      colorScheme: const ColorScheme.light(
        primary: navy,
        onPrimary: Colors.white,
        secondary: gold,
        onSecondary: navy,
        tertiary: deepTeal,
        surface: surface,
        onSurface: textPrimary,
        error: errorText,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: navy,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: border),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: navy, width: 1.5),
        ),
      ),
    );
  }

  static ThemeData darkTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: navy,
      colorScheme: const ColorScheme.dark(
        primary: gold,
        onPrimary: navy,
        secondary: teal,
        onSecondary: Colors.white,
        surface: navyLight,
        onSurface: Colors.white,
        error: Color(0xFFFCA5A5),
      ),
      cardTheme: CardThemeData(
        color: navyLight,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: Color(0xFF233B5E)),
        ),
      ),
    );
  }
}

/// Verified company contact directory (Blueprint Sec. 18 & 29).
class CompanyDirectory {
  CompanyDirectory._();

  static const String brandName = 'AL-BAHR HORIZON TRAVELS & CONSULTANTS';
  static const String workingAppName = 'HORIZON ONE';
  static const String publicWebsite = 'https://www.albahrtravels.com/';
  static const String proposedOsUrl = 'https://os.albahrtravels.com/';
  static const String supportPhone = '+92 325 7938125';
  static const String supportEmail = 'albahrtravelconsultants@gmail.com';
  static const String officeAddress = '78 E Block, Architect Engineering Housing Society, Lahore, Pakistan';
}
