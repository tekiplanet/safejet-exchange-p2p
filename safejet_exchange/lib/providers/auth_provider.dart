import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/material.dart';
import '../screens/auth/login_screen.dart';
import 'dart:async';
import 'package:dio/dio.dart';
import '../services/biometric_settings_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  bool _isLoading = false;
  bool _isLoggedIn = false;
  String? _error;
  BuildContext? _context;
  User? _user;
  Timer? _refreshTimer;
  Timer? _tokenRefreshTimer;
  DateTime? _tokenExpiryTime;
  String? _lastVerificationToken;

  AuthProvider() {
    // Only check auth status on startup, don't start refresh timer yet
    checkAuthStatus().then((_) {
      // Only start refresh timer if user is logged in
      if (_isLoggedIn) {
        _startPeriodicRefresh();
      }
    });
  }

  void _startPeriodicRefresh() {
    _refreshTimer = Timer.periodic(const Duration(minutes: 5), (_) {
      // Don't make API calls, just check stored data
      checkAuthStatus();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  bool get isLoading => _isLoading;
  bool get isLoggedIn => _isLoggedIn;
  String? get error => _error;
  User? get user => _user;

  void setContext(BuildContext context) {
    _context = context;
  }

  Future<void> handleSessionExpiration() async {
    print('Handling session expiration...');
    await logout();
    if (_context != null && _context!.mounted) {
      Navigator.of(_context!).pushNamedAndRemoveUntil(
        '/login',
        (route) => false,
      );
    }
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.login(email, password);
      print('Login response: $response'); // Debug log

      _isLoading = false;
      notifyListeners();

      // If 2FA is required, don't store tokens yet
      if (response['requires2FA'] == true) {
        return response;
      }

      // Store tokens
      await _authService.storage.write(key: 'accessToken', value: response['accessToken']);
      await _authService.storage.write(key: 'refreshToken', value: response['refreshToken']);
      
      // Store for biometric if enabled (with error handling)
      try {
        final biometricService = BiometricSettingsService();
        final biometricEnabled = await biometricService.getBiometricStatus();
        if (biometricEnabled) {
          print('Storing tokens for biometric auth...');
          await biometricService.storeBiometricTokens(
            response['accessToken'],
            response['refreshToken'],
          );
        }
      } catch (e) {
        print('Error handling biometric storage: $e');
      }

      // Store user data only if 2FA is not required or after 2FA verification
      await _authService.storage.write(key: 'user', value: json.encode(response['user']));

      _user = User.fromJson(response['user']);
      _startPeriodicRefresh();  // Start refresh timer after login
      notifyListeners();

      // Track token expiry
      _updateTokenExpiry(response['accessToken']);

      return response;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      print('Starting logout...');
      _refreshTimer?.cancel();
      _tokenRefreshTimer?.cancel();
      
      // Only clear auth tokens, not biometric tokens
      await _authService.storage.delete(key: 'accessToken');
      await _authService.storage.delete(key: 'refreshToken');
      await _authService.storage.delete(key: 'user');
      
      _isLoggedIn = false;
      _user = null;
      _error = null;
      
      print('Logout complete - auth tokens cleared');
      notifyListeners();
    } catch (e) {
      print('Error during logout: $e');
      rethrow;
    }
  }

  Future<void> checkAuthStatus() async {
    try {
      _isLoading = true;
      notifyListeners();

      final token = await _authService.storage.read(key: 'accessToken');
      
      if (token == null) {
        _isLoading = false;
        _isLoggedIn = false;
        _user = null;
        notifyListeners();
        return;
      }

      // Try to get user from storage first
      final userJson = await _authService.storage.read(key: 'user');
      if (userJson != null) {
        _user = User.fromJson(json.decode(userJson));
        _isLoggedIn = true;
      }
    } catch (e) {
      print('Error checking auth status: $e');
      _isLoggedIn = false;
      _user = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchFreshUserData() async {
    try {
      _isLoading = true;
      notifyListeners();

      final token = await _authService.storage.read(key: 'accessToken');
      
      if (token == null) {
        _isLoggedIn = false;
        _user = null;
        notifyListeners();
        return;
      }

      final userData = await _authService.getCurrentUser();
      _user = User.fromJson(userData);
      _isLoggedIn = true;
    } catch (e) {
      print('Error fetching fresh user data: $e');
      if (e is DioException && e.response?.statusCode == 401) {
        _isLoggedIn = false;
        _user = null;
        await _authService.storage.delete(key: 'accessToken');
      }
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
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

  Future<Map<String, dynamic>> verifyEmail(String code) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.verifyEmail(code);
      _isLoggedIn = true;
      _isLoading = false;
      notifyListeners();
      return response;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
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

  Future<void> verify2FA(String code, [String? email]) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      if (email == null) {
        print('🔐 Auth Provider: Verifying action with 2FA');
        await _authService.verify2FAForAction(code);
      } else {
        print('🔐 Auth Provider: Verifying login with 2FA');
        final response = await _authService.verify2FA(email, code);
        
        if (response['accessToken'] == null) {
          throw 'Invalid server response: No access token provided';
        }

        // Store tokens after successful 2FA verification
        await _authService.storage.write(
          key: 'accessToken', 
          value: response['accessToken']
        );
        await _authService.storage.write(
          key: 'refreshToken', 
          value: response['refreshToken']
        );
        await _authService.storage.write(
          key: 'user', 
          value: json.encode(response['user'])
        );
        
        _isLoggedIn = true;
        _user = User.fromJson(response['user']);
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      print('❌ Auth Provider: 2FA verification failed: $e');
      _error = e.toString()
          .replaceAll('Exception: ', '')
          .replaceAll('Error: ', '');
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> forgotPassword(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.forgotPassword(email);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> resetPassword(String email, String code, String newPassword) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.resetPassword(email, code, newPassword);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<Map<String, dynamic>> generate2FASecret() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.generate2FASecret();
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<Map<String, dynamic>> enable2FA(String code) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.enable2FA(code);
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> disable2FA(String code, String codeType) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      await _authService.disable2FA(code, codeType);
      await loadUser();  // Refresh user data after disable
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString()
          .replaceAll('Exception: ', '')
          .replaceAll('Error: ', '');
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<List<String>> getBackupCodes() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authService.getBackupCodes();
      _isLoading = false;
      notifyListeners();
      return List<String>.from(result['backupCodes']);
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getCurrentUser() async {
    try {
      return await _authService.getCurrentUser();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> storeTemp2FASecret(String secret) async {
    await _authService.storeTemp2FASecret(secret);
  }

  Future<void> updatePhone({
    required String phone,
    required String countryCode,
    required String countryName,
    required String phoneWithoutCode,
  }) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      await _authService.updatePhone(
        phone: phone,
        countryCode: countryCode,
        countryName: countryName,
        phoneWithoutCode: phoneWithoutCode,
      );

      // Update local user data
      final updatedUser = await _authService.getCurrentUser();
      await _updateStoredUser(updatedUser);

    } catch (e) {
      _error = e.toString();
      if (e.toString().contains('Session expired')) {
        await handleSessionExpiration();
      }
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Helper method to update stored user data
  Future<void> _updateStoredUser(Map<String, dynamic> user) async {
    final storage = const FlutterSecureStorage();
    await storage.write(key: 'user', value: json.encode(user));
  }

  Future<void> sendPhoneVerification() async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      await _authService.sendPhoneVerification();
    } catch (e) {
      _error = e.toString();
      if (e.toString().contains('Session expired')) {
        await handleSessionExpiration();
      }
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> verifyPhone(String code) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final response = await _authService.verifyPhone(code);
      await _updateStoredUser(response['user']);
    } catch (e) {
      _error = e.toString();
      if (e.toString().contains('Session expired')) {
        await handleSessionExpiration();
      }
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> verifyCurrentPassword(String currentPassword) async {
    try {
      final response = await _authService.verifyCurrentPassword(currentPassword);
      return response;
    } catch (e) {
      print('Error verifying password: $e');
      rethrow;
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await _authService.changePassword(currentPassword, newPassword);
    } catch (e) {
      print('Error changing password: $e');
      rethrow;
    }
  }

  Future<void> loadUser() async {
    try {
      final userData = await _authService.getCurrentUser();
      _user = User.fromJson(userData); // You'll need to create this model
      notifyListeners();
    } catch (e) {
      print('Error loading user: $e');
      rethrow;
    }
  }

  Future<void> verify2FAForAction(String code) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      await _authService.verify2FAForAction(code);
      
      _isLoading = false;
      notifyListeners();
      _lastVerificationToken = code;  // Store the code after successful verification
    } catch (e) {
      _error = e.toString()
          .replaceAll('Exception: ', '')
          .replaceAll('Error: ', '');
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> handleUnauthorized(BuildContext context) async {
    print('Handling unauthorized access...');
    await logout();
    
    if (context.mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (context) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  Future<void> loadUserData() async {
    try {
      // First try to load from storage
      final storage = const FlutterSecureStorage();
      final userJson = await storage.read(key: 'user');
      
      if (userJson != null) {
        final userData = json.decode(userJson);
        _user = User.fromJson(userData);
        notifyListeners();
      }
    } catch (e) {
      print('Error loading user data: $e');
      rethrow;
    }
  }

  Future<void> refreshUserData() async {
    try {
      final userData = await _authService.getCurrentUser();
      if (userData != null) {
        _user = User.fromJson(userData);
        await _authService.storage.write(
          key: 'user',
          value: json.encode(userData),
        );
        notifyListeners();
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        // Let the interceptor handle it
        rethrow;
      }
      print('Error refreshing user data: $e');
    } catch (e) {
      print('Error refreshing user data: $e');
    }
  }

  Future<void> updateProfile(Map<String, dynamic> data) async {
    try {
      await _authService.updateProfile(data);
      await refreshUserData();  // Refresh after profile update
    } catch (e) {
      // ... error handling
    }
  }

  // Parse JWT to get expiration time
  void _updateTokenExpiry(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return;

      final payload = json.decode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
      );
      
      // exp is in seconds, convert to DateTime
      _tokenExpiryTime = DateTime.fromMillisecondsSinceEpoch(payload['exp'] * 1000);
      
      // Schedule token refresh 5 minutes before expiration
      _scheduleTokenRefresh();
    } catch (e) {
      print('Error parsing token: $e');
    }
  }

  void _scheduleTokenRefresh() {
    _tokenRefreshTimer?.cancel();
    
    try {
      if (_tokenExpiryTime == null) {
        print('No token expiry time set');
        return;
      }

      final timeUntilExpiry = _tokenExpiryTime!.difference(DateTime.now());
      if (timeUntilExpiry.isNegative) {
        print('Token already expired');
        handleSessionExpiration();
        return;
      }

      // Refresh 5 minutes before expiry
      final refreshTime = timeUntilExpiry - const Duration(minutes: 5);
      if (refreshTime.isNegative) {
        print('Token too close to expiry');
        handleSessionExpiration();
        return;
      }

      print('Scheduling token refresh in ${refreshTime.inMinutes} minutes');
      _tokenRefreshTimer = Timer(refreshTime, () async {
        try {
          final response = await _authService.refreshToken();
          if (response['accessToken'] != null) {
            _updateTokenExpiry(response['accessToken']);
            print('Token refreshed successfully');
          } else {
            print('No access token in refresh response');
            await handleSessionExpiration();
          }
        } catch (e) {
          print('Error during scheduled token refresh: $e');
          await handleSessionExpiration();
        }
      });
    } catch (e) {
      print('Error scheduling token refresh: $e');
      handleSessionExpiration();
    }
  }

  Future<void> refreshToken() async {
    try {
      final refreshToken = await _authService.storage.read(key: 'refreshToken');
      if (refreshToken == null) throw 'No refresh token';

      final response = await _authService.refreshToken();
      
      // Update stored tokens
      await _authService.storage.write(
        key: 'accessToken',
        value: response['accessToken'],
      );
      
      // Update token expiry
      _updateTokenExpiry(response['accessToken']);
      
    } catch (e) {
      // Only clear auth state if refresh actually failed
      if (e is DioException && e.response?.statusCode == 401) {
        await logout();
        rethrow;
      }
      // Other errors might be temporary
      rethrow;
    }
  }

  String? getLastVerificationToken() {
    final token = _lastVerificationToken;
    _lastVerificationToken = null;  // Clear it after use
    return token;
  }

  Future<void> loginWithTokens(String token, String refreshToken) async {
    try {
      print('Starting biometric login...');
      // Store in normal auth storage
      await _authService.storage.write(key: 'accessToken', value: token);
      await _authService.storage.write(key: 'refreshToken', value: refreshToken);
      
      print('Auth tokens stored, fetching user data...');
      final userData = await _authService.getCurrentUser();
      if (userData != null) {
        _user = User.fromJson(userData);
        await _authService.storage.write(
          key: 'user',
          value: json.encode(userData),
        );
      }
      
      _isLoggedIn = true;
      _startPeriodicRefresh();
      notifyListeners();
      
      print('Biometric login successful');
    } catch (e) {
      print('Error in biometric login: $e');
      rethrow;
    }
  }
}

class User {
  final String id;
  final String email;
  final String fullName;
  final bool emailVerified;
  final bool phoneVerified;
  final bool twoFactorEnabled;
  final bool biometricEnabled;
  final String? phone;
  final String? countryCode;
  final String? countryName;
  final int kycLevel;
  final Map<String, dynamic>? kycData;

  User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.emailVerified,
    required this.phoneVerified,
    required this.twoFactorEnabled,
    this.biometricEnabled = false,
    this.phone,
    this.countryCode,
    this.countryName,
    required this.kycLevel,
    this.kycData,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      fullName: json['fullName'],
      emailVerified: json['emailVerified'] ?? false,
      phoneVerified: json['phoneVerified'] ?? false,
      twoFactorEnabled: json['twoFactorEnabled'] ?? false,
      biometricEnabled: json['biometricEnabled'] ?? false,
      phone: json['phone'],
      countryCode: json['countryCode'],
      countryName: json['countryName'],
      kycLevel: json['kycLevel'] ?? 0,
      kycData: json['kycData'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'emailVerified': emailVerified,
      'phoneVerified': phoneVerified,
      'twoFactorEnabled': twoFactorEnabled,
      'biometricEnabled': biometricEnabled,
      'phone': phone,
      'countryCode': countryCode,
      'countryName': countryName,
      'kycLevel': kycLevel,
      'kycData': kycData,
    };
  }
} 