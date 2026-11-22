import 'package:material_ui/material_ui.dart';
import 'core/os_engine.dart';
import 'core/tokens.dart';
import 'features/auth_screens.dart';
import 'widgets/responsive_shell.dart';

void main() {
  runApp(const HorizonOneApp());
}

class HorizonOneApp extends StatefulWidget {
  final HorizonOsStore? store;
  const HorizonOneApp({super.key, this.store});

  @override
  State<HorizonOneApp> createState() => _HorizonOneAppState();
}

class _HorizonOneAppState extends State<HorizonOneApp> {
  late final HorizonOsStore _store;

  @override
  void initState() {
    super.initState();
    _store = widget.store ?? HorizonOsStore();
  }

  @override
  void dispose() {
    if (widget.store == null) {
      _store.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _store,
      builder: (context, _) {
        Widget home;
        if (!_store.splashComplete) {
          home = SplashScreen(store: _store);
        } else if (!_store.authenticated) {
          home = LoginScreen(store: _store);
        } else {
          home = ResponsiveOsShell(store: _store);
        }

        return MaterialApp(
          title: '${CompanyDirectory.workingAppName} — ${CompanyDirectory.brandName}',
          debugShowCheckedModeBanner: false,
          theme: BrandTokens.lightTheme(),
          home: home,
        );
      },
    );
  }
}
