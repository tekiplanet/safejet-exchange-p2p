import 'package:dio/dio.dart';
import '../providers/auth_provider.dart';
import 'package:flutter/material.dart';

class AuthInterceptor extends Interceptor {
  final AuthProvider authProvider;
  final BuildContext? context;

  AuthInterceptor(this.authProvider, [this.context]);

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 || err.response?.statusCode == 403) {
      // Session expired
      if (context != null && context!.mounted) {
        await authProvider.handleUnauthorized(context!);
      } else {
        // If no context, just clear the auth state
        await authProvider.logout();
      }
    }
    handler.next(err);
  }
} 