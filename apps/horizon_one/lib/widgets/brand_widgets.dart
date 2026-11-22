import 'dart:math' as math;
import 'package:material_ui/material_ui.dart';
import '../core/tokens.dart';

class BrandWordmark extends StatelessWidget {
  final bool compact;
  final bool onDark;
  final bool showAssetPendingBadge;

  const BrandWordmark({
    super.key,
    this.compact = false,
    this.onDark = true,
    this.showAssetPendingBadge = true,
  });

  @override
  Widget build(BuildContext context) {
    final titleColor = onDark ? Colors.white : BrandTokens.navy;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: compact ? 34 : 40,
              height: compact ? 34 : 40,
              decoration: BoxDecoration(
                color: BrandTokens.navyLight,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: BrandTokens.gold, width: 1.5),
              ),
              alignment: Alignment.center,
              child: Text(
                'AB',
                style: TextStyle(
                  color: BrandTokens.gold,
                  fontWeight: FontWeight.w800,
                  fontSize: compact ? 13 : 15,
                  letterSpacing: 0.8,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    CompanyDirectory.workingAppName,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: titleColor,
                      fontWeight: FontWeight.w800,
                      fontSize: compact ? 14 : 16,
                      letterSpacing: 0.7,
                    ),
                  ),
                  Text(
                    'AL-BAHR HORIZON',
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: BrandTokens.gold,
                      fontWeight: FontWeight.w600,
                      fontSize: compact ? 10 : 11,
                      letterSpacing: 0.6,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        if (!compact && showAssetPendingBadge) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: BrandTokens.gold.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Text(
              'OFFICIAL LOGO ASSET PENDING',
              style: TextStyle(
                color: BrandTokens.gold,
                fontSize: 10,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.4,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class OrbitalHaloPainter extends CustomPainter {
  final double progress;
  final Color ringColor;
  const OrbitalHaloPainter(this.progress, {this.ringColor = BrandTokens.gold});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 4;
    final basePaint = Paint()
      ..color = ringColor.withValues(alpha: 0.25)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;
    canvas.drawCircle(center, radius, basePaint);

    final sweepPaint = Paint()
      ..color = ringColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5
      ..strokeCap = StrokeCap.round;

    final start = progress * 2 * math.pi;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      start,
      math.pi * 0.75,
      false,
      sweepPaint,
    );
  }

  @override
  bool shouldRepaint(covariant OrbitalHaloPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.ringColor != ringColor;
}

/// Ticket shape with circular left & right boarding-pass notches.
class BoardingPassClipper extends CustomClipper<Path> {
  final double notchOffsetFromBottom;
  const BoardingPassClipper({this.notchOffsetFromBottom = 92});

  @override
  Path getClip(Size size) {
    const r = 14.0;
    const corner = 18.0;
    final notchY = math.max(corner + r, size.height - notchOffsetFromBottom);

    final path = Path()
      ..moveTo(corner, 0)
      ..lineTo(size.width - corner, 0)
      ..quadraticBezierTo(size.width, 0, size.width, corner)
      ..lineTo(size.width, notchY - r)
      ..arcToPoint(Offset(size.width, notchY + r), radius: const Radius.circular(r), clockwise: false)
      ..lineTo(size.width, size.height - corner)
      ..quadraticBezierTo(size.width, size.height, size.width - corner, size.height)
      ..lineTo(corner, size.height)
      ..quadraticBezierTo(0, size.height, 0, size.height - corner)
      ..lineTo(0, notchY + r)
      ..arcToPoint(Offset(0, notchY - r), radius: const Radius.circular(r), clockwise: false)
      ..lineTo(0, corner)
      ..quadraticBezierTo(0, 0, corner, 0)
      ..close();
    return path;
  }

  @override
  bool shouldReclip(covariant BoardingPassClipper oldClipper) =>
      oldClipper.notchOffsetFromBottom != notchOffsetFromBottom;
}

/// Deterministic visual barcode strip derived from a real booking/ticket reference.
class DeterministicBarcodePainter extends CustomPainter {
  final String seed;
  const DeterministicBarcodePainter(this.seed);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = BrandTokens.navy;
    final codes = seed.codeUnits.isEmpty ? [65, 76, 66] : seed.codeUnits;
    var x = 4.0;
    var idx = 0;
    while (x < size.width - 4) {
      final val = codes[idx % codes.length] + idx * 7;
      final barW = (val % 3 + 1) * 1.6;
      final gap = ((val >> 2) % 2 + 1) * 1.8;
      if (x + barW <= size.width - 4) {
        canvas.drawRect(Rect.fromLTWH(x, 4, barW, size.height - 8), paint);
      }
      x += barW + gap;
      idx++;
    }
  }

  @override
  bool shouldRepaint(covariant DeterministicBarcodePainter oldDelegate) => oldDelegate.seed != seed;
}

class StatusBadge extends StatelessWidget {
  final String label;
  final Color bg;
  final Color fg;

  const StatusBadge({super.key, required this.label, required this.bg, required this.fg});

  factory StatusBadge.success(String label) =>
      StatusBadge(label: label, bg: BrandTokens.successBg, fg: BrandTokens.successText);

  factory StatusBadge.warning(String label) =>
      StatusBadge(label: label, bg: BrandTokens.warnBg, fg: BrandTokens.warnText);

  factory StatusBadge.error(String label) =>
      StatusBadge(label: label, bg: BrandTokens.errorBg, fg: BrandTokens.errorText);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}

class SkeletonLoadingBlock extends StatelessWidget {
  const SkeletonLoadingBlock({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: BrandTokens.teal),
            ),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Loading workspace data (never showing fake 0 metrics before verified)...',
                style: TextStyle(color: BrandTokens.teal, fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: List.generate(
            4,
            (_) => Container(
              width: 220,
              height: 92,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: BrandTokens.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(height: 10, width: 100, color: const Color(0xFFE5EAF0)),
                  Container(height: 20, width: 70, color: const Color(0xFFD6DEE7)),
                  Container(height: 10, width: 140, color: const Color(0xFFEEF2F6)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class EmptyStateCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final VoidCallback? onClearFilters;
  final VoidCallback? onCreate;
  final String createLabel;

  const EmptyStateCard({
    super.key,
    required this.title,
    required this.subtitle,
    this.onClearFilters,
    this.onCreate,
    this.createLabel = '+ Create New',
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircleAvatar(
                radius: 24,
                backgroundColor: BrandTokens.background,
                child: Icon(Icons.inbox_outlined, color: BrandTokens.navy),
              ),
              const SizedBox(height: 12),
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 6),
              Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: BrandTokens.textMuted, fontSize: 13)),
              const SizedBox(height: 16),
              Wrap(
                spacing: 10,
                runSpacing: 8,
                children: [
                  if (onClearFilters != null)
                    OutlinedButton(onPressed: onClearFilters, child: const Text('Clear Filters')),
                  if (onCreate != null)
                    FilledButton(onPressed: onCreate, child: Text(createLabel)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
