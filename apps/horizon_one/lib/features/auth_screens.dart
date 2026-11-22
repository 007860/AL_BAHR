import 'dart:async';
import 'package:material_ui/material_ui.dart';
import '../core/l10n.dart';
import '../core/models.dart';
import '../core/os_engine.dart';
import '../core/tokens.dart';
import '../widgets/brand_widgets.dart';

class SplashScreen extends StatefulWidget {
  final HorizonOsStore store;
  const SplashScreen({super.key, required this.store});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  Timer? _autoAdvanceTimer;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(seconds: 3))..repeat();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) widget.store.runBootstrap();
    });
    _autoAdvanceTimer = Timer(const Duration(milliseconds: 1600), () {
      if (mounted && !widget.store.bootstrapFailed && !widget.store.splashComplete) {
        widget.store.skipSplash();
      }
    });
  }

  @override
  void dispose() {
    _autoAdvanceTimer?.cancel();
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = AppStrings(widget.store.locale);
    final reducedMotion = MediaQuery.of(context).disableAnimations;
    return Scaffold(
      backgroundColor: BrandTokens.navy,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 112,
                    height: 112,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        if (!reducedMotion)
                          AnimatedBuilder(
                            animation: _ctrl,
                            builder: (_, _) => CustomPaint(
                              size: const Size(112, 112),
                              painter: OrbitalHaloPainter(_ctrl.value),
                            ),
                          ),
                        Container(
                          width: 78,
                          height: 78,
                          decoration: BoxDecoration(
                            color: BrandTokens.navyLight,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: BrandTokens.gold, width: 1.8),
                          ),
                          alignment: Alignment.center,
                          child: const Text(
                            'ABH',
                            style: TextStyle(color: BrandTokens.gold, fontSize: 22, fontWeight: FontWeight.w800),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    CompanyDirectory.workingAppName,
                    style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: 1.2),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    CompanyDirectory.brandName,
                    textAlign: TextAlign.center,
                    style: TextStyle(color: BrandTokens.gold, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  StatusBadge.warning(s.t('logo_pending')),
                  const SizedBox(height: 24),
                  LinearProgressIndicator(
                    value: widget.store.bootstrapProgress,
                    backgroundColor: Colors.white12,
                    color: BrandTokens.teal,
                    minHeight: 6,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    widget.store.bootstrapStage,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 20),
                  Wrap(
                    spacing: 12,
                    children: [
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: BrandTokens.gold,
                          side: const BorderSide(color: BrandTokens.gold),
                          minimumSize: const Size(44, 44),
                        ),
                        onPressed: widget.store.skipSplash,
                        child: Text(s.t('skip_animation')),
                      ),
                      if (widget.store.bootstrapFailed)
                        FilledButton(
                          style: FilledButton.styleFrom(
                            backgroundColor: BrandTokens.gold,
                            foregroundColor: BrandTokens.navy,
                            minimumSize: const Size(44, 44),
                          ),
                          onPressed: () => widget.store.runBootstrap(),
                          child: Text(s.t('retry')),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  final HorizonOsStore store;
  const LoginScreen({super.key, required this.store});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController(text: 'ceo@sandbox.local');
  final _passCtrl = TextEditingController(text: 'HorizonSandbox!2026');
  bool _obscurePassword = true;
  bool _submitting = false;
  String? _statusMsg;
  bool _isError = false;
  OsRole _selectedSandboxRole = OsRole.ceo;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSignIn() async {
    setState(() {
      _submitting = true;
      _statusMsg = null;
    });
    final res = await widget.store.signIn(
      email: _emailCtrl.text,
      password: _passCtrl.text,
      sandboxRole: _selectedSandboxRole,
    );
    if (!mounted) return;
    setState(() {
      _submitting = false;
      _isError = !res.ok;
      _statusMsg = res.message;
    });
  }

  void _openInviteDialog() {
    final tokenCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Redeem One-Time Employee Invite'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter the single-use invitation token provided by your CEO/Manager and set a strong password (>=10 chars).'),
            const SizedBox(height: 12),
            TextField(controller: tokenCtrl, decoration: const InputDecoration(labelText: 'Invitation Token')),
            const SizedBox(height: 10),
            TextField(controller: passCtrl, obscureText: true, decoration: const InputDecoration(labelText: 'New Password')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              final r = widget.store.redeemInviteToken(tokenCtrl.text, passCtrl.text);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r.message)));
            },
            child: const Text('Activate Account'),
          ),
        ],
      ),
    );
  }

  void _openServerConfigDialog() {
    final urlCtrl = TextEditingController(text: widget.store.serverBaseUrl);
    var liveMode = widget.store.useLiveServer;
    showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: const Text('Server Connection Mode'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Connect to Live OS API'),
                subtitle: Text(liveMode ? 'Calls real HTTPS backend' : 'Uses On-Device Evaluation Sandbox'),
                value: liveMode,
                onChanged: (v) => setLocal(() => liveMode = v),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: urlCtrl,
                decoration: const InputDecoration(labelText: 'OS API Base URL', hintText: 'https://os.albahrtravels.com'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                widget.store.serverBaseUrl = urlCtrl.text.trim();
                widget.store.useLiveServer = liveMode;
                widget.store.refresh();
                Navigator.pop(ctx);
              },
              child: const Text('Save Connection'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = AppStrings(widget.store.locale);
    final wide = MediaQuery.of(context).size.width >= 820;

    final formWidget = Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(s.t('sign_in'), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                IconButton(
                  tooltip: 'Switch English / Urdu',
                  onPressed: () => widget.store.setLocale(widget.store.locale == 'en' ? 'ur' : 'en'),
                  icon: const Icon(Icons.translate),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              widget.store.useLiveServer
                  ? 'Connected Mode: ${widget.store.serverBaseUrl}'
                  : 'Evaluation Sandbox Mode (Zero live customer PII)',
              style: const TextStyle(fontSize: 12, color: BrandTokens.textMuted),
            ),
            const SizedBox(height: 16),
            if (_statusMsg != null) ...[
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _isError ? BrandTokens.errorBg : BrandTokens.successBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _statusMsg!,
                  style: TextStyle(color: _isError ? BrandTokens.errorText : BrandTokens.successText, fontSize: 13),
                ),
              ),
              const SizedBox(height: 12),
            ],
            TextField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(labelText: s.t('email')),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _passCtrl,
              obscureText: _obscurePassword,
              decoration: InputDecoration(
                labelText: s.t('password'),
                suffixIcon: IconButton(
                  tooltip: _obscurePassword ? 'Show Password' : 'Hide Password',
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                ),
              ),
            ),
            if (!widget.store.useLiveServer) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<OsRole>(
                initialValue: _selectedSandboxRole,
                decoration: const InputDecoration(labelText: 'Sandbox Role Preview'),
                items: OsRole.values
                    .map((r) => DropdownMenuItem(value: r, child: Text(r.displayTitle)))
                    .toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _selectedSandboxRole = v);
                },
              ),
            ],
            const SizedBox(height: 16),
            FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(double.infinity, 48)),
              onPressed: _submitting ? null : _handleSignIn,
              child: _submitting
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(s.t('sign_in')),
            ),
            const SizedBox(height: 12),
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              spacing: 8,
              runSpacing: 4,
              children: [
                TextButton(
                  onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('If an active account matches, recovery instructions will be sent.')),
                  ),
                  child: Text(s.t('forgot_password')),
                ),
                TextButton(onPressed: _openInviteDialog, child: Text(s.t('activate_invite'))),
                TextButton(onPressed: _openServerConfigDialog, child: const Text('Server URL')),
              ],
            ),
            const Divider(height: 20),
            Text(
              'Public Site: ${CompanyDirectory.publicWebsite}  ·  Support: ${CompanyDirectory.supportPhone}',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: BrandTokens.textMuted),
            ),
          ],
        ),
      ),
    );

    return Directionality(
      textDirection: s.direction,
      child: Scaffold(
        body: SafeArea(
          child: wide
              ? Row(
                  children: [
                    Expanded(
                      flex: 5,
                      child: Container(
                        color: BrandTokens.navy,
                        padding: const EdgeInsets.all(36),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const BrandWordmark(compact: false, onDark: true),
                            const Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Zero-AI Deterministic Travel Operations OS',
                                  style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800),
                                ),
                                SizedBox(height: 12),
                                Text(
                                  'Role-isolated dashboards, manual bank verification, supplier-evidenced ticketing, least-loaded smart assignment, and offline-safe form drafts.',
                                  style: TextStyle(color: Colors.white70, fontSize: 14, height: 1.5),
                                ),
                              ],
                            ),
                            Text(
                              CompanyDirectory.officeAddress,
                              style: const TextStyle(color: Colors.white60, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 6,
                      child: Center(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(32),
                          child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 460), child: formWidget),
                        ),
                      ),
                    ),
                  ],
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(color: BrandTokens.navy, borderRadius: BorderRadius.circular(12)),
                        child: const BrandWordmark(compact: false, onDark: true),
                      ),
                      const SizedBox(height: 16),
                      formWidget,
                    ],
                  ),
                ),
        ),
      ),
    );
  }
}
