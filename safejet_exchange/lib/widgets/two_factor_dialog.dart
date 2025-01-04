import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../config/theme/colors.dart';

class TwoFactorDialog extends StatefulWidget {
  const TwoFactorDialog({super.key});

  @override
  State<TwoFactorDialog> createState() => _TwoFactorDialogState();
}

class _TwoFactorDialogState extends State<TwoFactorDialog> {
  final List<TextEditingController> _controllers = List.generate(
    6,
    (index) => TextEditingController(),
  );
  final List<FocusNode> _focusNodes = List.generate(
    6,
    (index) => FocusNode(),
  );

  @override
  void dispose() {
    for (var controller in _controllers) {
      controller.dispose();
    }
    for (var node in _focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  void _onCodeChanged(String value, int index) {
    if (value.length == 1 && index < 5) {
      _focusNodes[index + 1].requestFocus();
    }
    if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
    if (_controllers.every((controller) => controller.text.isNotEmpty)) {
      final code = _controllers.map((c) => c.text).join();
      // TODO: Validate 2FA code
      Navigator.pop(context, code);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return AlertDialog(
      backgroundColor: isDark ? SafeJetColors.primaryBackground : SafeJetColors.lightBackground,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      title: const Text('2FA Verification'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Enter the 6-digit code from your authenticator app'),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: List.generate(
              6,
              (index) => SizedBox(
                width: 40,
                child: TextField(
                  controller: _controllers[index],
                  focusNode: _focusNodes[index],
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  maxLength: 1,
                  onChanged: (value) => _onCodeChanged(value, index),
                  decoration: InputDecoration(
                    counterText: '',
                    filled: true,
                    fillColor: isDark 
                        ? SafeJetColors.primaryAccent.withOpacity(0.1)
                        : SafeJetColors.lightCardBackground,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: isDark
                            ? SafeJetColors.primaryAccent.withOpacity(0.2)
                            : SafeJetColors.lightCardBorder,
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: isDark
                            ? SafeJetColors.primaryAccent.withOpacity(0.2)
                            : SafeJetColors.lightCardBorder,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            final code = _controllers.map((c) => c.text).join();
            Navigator.pop(context, code);
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: SafeJetColors.secondaryHighlight,
            foregroundColor: Colors.black,
          ),
          child: const Text('Verify'),
        ),
      ],
    );
  }
} 