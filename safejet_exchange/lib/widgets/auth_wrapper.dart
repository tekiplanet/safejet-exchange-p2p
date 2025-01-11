import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class AuthWrapper extends StatefulWidget {
  final Widget child;

  const AuthWrapper({
    super.key,
    required this.child,
  });

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  @override
  void initState() {
    super.initState();
    // Initial load of user data
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    if (mounted) {
      await Provider.of<AuthProvider>(context, listen: false).loadUserData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
} 