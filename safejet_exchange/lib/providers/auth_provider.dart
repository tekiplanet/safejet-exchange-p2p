import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  bool _isLoading = false;
  bool _isLoggedIn = false;
  String? _error;

  bool get isLoading => _isLoading;
  bool get isLoggedIn => _isLoggedIn;
  String? get error => _error;

  Future<Map<String, dynamic>> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.login(email, password);
      _isLoggedIn = true;
      _isLoading = false;
      notifyListeners();
      return response;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      
      // Check if it's an email verification error
      if (_error!.contains('verify your email')) {
        return {'requiresEmailVerification': true};
      }
      
      rethrow;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _isLoggedIn = false;
    notifyListeners();
  }

  Future<void> checkAuthStatus() async {
    _isLoggedIn = await _authService.isLoggedIn();
    notifyListeners();
  }

  Future<void> register(String fullName, String email, String phone, String password, String countryCode, String countryName) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.register(
        fullName,
        email,
        phone,
        password,
        countryCode,
        countryName,
      );
      _isLoggedIn = true;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> verifyEmail(String code) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.verifyEmail(code);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      print('Provider error: $e'); // For debugging
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> resendVerificationCode(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.resendVerificationCode(email);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> verify2FA(String email, String code) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.verify2FA(email, code);
      _isLoggedIn = true;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      print('2FA Provider error: $e'); // For debugging
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }
} 