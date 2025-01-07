import 'package:dio/dio.dart';
import '../models/kyc_level.dart';
import '../models/kyc_details.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:onfido_sdk/onfido_sdk.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class KYCService {
  final Dio _dio;
  final _storage = const FlutterSecureStorage();

  // Store applicant ID for later use
  String? _currentApplicantId;

  // Store Onfido instance
  Onfido? _onfido;

  KYCService(Dio dio) : _dio = dio {
    _dio.options.baseUrl = dotenv.env['API_URL'] ?? 'http://localhost:3000';
    _dio.options.connectTimeout = const Duration(seconds: 5);
    _dio.options.receiveTimeout = const Duration(seconds: 3);
  }

  Future<Map<String, String>> _getAuthHeaders() async {
    final token = await _storage.read(key: 'accessToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<KYCDetails> getUserKYCDetails() async {
    try {
      final headers = await _getAuthHeaders();
      final response = await _dio.get(
        '/kyc/details',
        options: Options(headers: headers),
      );
      
      if (response.statusCode == 200) {
        return KYCDetails.fromJson(response.data);
      } else {
        throw Exception('Failed to load KYC details: ${response.statusMessage}');
      }
    } catch (e) {
      if (e is DioException) {
        if (e.type == DioExceptionType.connectionTimeout) {
          throw Exception('Connection timeout. Please check your internet connection.');
        } else if (e.response?.statusCode == 401) {
          throw Exception('Unauthorized. Please log in again.');
        }
        throw Exception('Network error: ${e.message}');
      }
      rethrow;
    }
  }

  Future<List<KYCLevel>> getAllKYCLevels() async {
    try {
      final headers = await _getAuthHeaders();
      final response = await _dio.get(
        '/kyc/levels',
        options: Options(headers: headers),
      );
      
      if (response.statusCode == 200) {
        return (response.data as List)
            .map((level) => KYCLevel.fromJson(level))
            .toList();
      } else {
        throw Exception('Failed to load KYC levels');
      }
    } catch (e) {
      print('Error getting KYC levels: $e');
      rethrow;
    }
  }

  Future<void> startKYCVerification() async {
    try {
      final headers = await _getAuthHeaders();
      final response = await _dio.post(
        '/kyc/onfido-token',
        options: Options(headers: headers),
      );
      
      if (response.statusCode == 200) {
        final sdkToken = response.data['token'];
        
        _onfido = Onfido(
          sdkToken: sdkToken,
          enterpriseFeatures: EnterpriseFeatures(
            hideOnfidoLogo: false,
          ),
        );

        final results = await _onfido!.start(
          flowSteps: FlowSteps(
            welcome: true,
            documentCapture: DocumentCapture(),
            faceCapture: FaceCapture.photo(
              withIntroScreen: true,
            ),
          ),
        );
        
        // Check if we have successful results
        if (results.isNotEmpty) {
          print('KYC verification completed successfully');
          return;
        }
        
        throw Exception('KYC verification failed or was cancelled');
      }
      
      throw Exception('Failed to get Onfido token');
    } catch (e) {
      print('KYC verification error: $e');
      rethrow;
    }
  }

  Future<void> submitIdentityDetails({
    required String firstName,
    required String lastName,
    required String dateOfBirth,
    required String address,
    required String city,
    required String state,
    required String country,
  }) async {
    try {
      print('Sending request to API:');
      print('URL: ${_dio.options.baseUrl}/auth/identity-details');
      print('Data: {');
      print('  firstName: $firstName,');
      print('  lastName: $lastName,');
      print('  dateOfBirth: $dateOfBirth,');
      print('  address: $address,');
      print('  city: $city,');
      print('  state: $state,');
      print('  country: $country');
      print('}');

      final token = await _storage.read(key: 'accessToken');
      final response = await _dio.put(
        '/auth/identity-details',
        data: {
          'firstName': firstName,
          'lastName': lastName,
          'dateOfBirth': dateOfBirth,
          'address': address,
          'city': city,
          'state': state,
          'country': country,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      print('API Response: ${response.data}');
      return response.data;
    } catch (e) {
      print('API Error: $e');
      if (e is DioException) {
        print('Response data: ${e.response?.data}');
        print('Response status: ${e.response?.statusCode}');
        print('Response headers: ${e.response?.headers}');
      }
      rethrow;
    }
  }

  Future<void> startDocumentVerification() async {
    try {
      final headers = await _getAuthHeaders();
      final response = await _dio.post(
        '/kyc/onfido-token',
        options: Options(headers: headers),
      );
      
      if (response.statusCode == 200) {
        final sdkToken = response.data['token'];
        
        _onfido = Onfido(
          sdkToken: sdkToken,
          enterpriseFeatures: EnterpriseFeatures(
            hideOnfidoLogo: false,
          ),
        );

        final results = await _onfido!.start(
          flowSteps: FlowSteps(
            welcome: true,
            documentCapture: DocumentCapture(
              documentType: DocumentType.nationalIdentityCard,
            ),
          ),
        );
        
        if (results.isNotEmpty) {
          print('Document verification completed successfully');
          return;
        }
        
        throw Exception('Document verification failed or was cancelled');
      }
      
      throw Exception('Failed to get Onfido token');
    } catch (e) {
      print('Document verification error: $e');
      rethrow;
    }
  }

  Future<void> startAddressVerification({DocumentType? documentType}) async {
    try {
      final headers = await _getAuthHeaders();
      final response = await _dio.post(
        '/kyc/onfido-token',
        options: Options(headers: headers),
      );
      
      if (response.statusCode == 200) {
        final sdkToken = response.data['token'];
        
        _onfido = Onfido(
          sdkToken: sdkToken,
          enterpriseFeatures: EnterpriseFeatures(
            hideOnfidoLogo: false,
          ),
        );

        final results = await _onfido!.start(
          flowSteps: FlowSteps(
            welcome: true,
            documentCapture: DocumentCapture(
              documentType: documentType ?? DocumentType.drivingLicence,
            ),
          ),
        );
        
        if (results.isNotEmpty) {
          print('Address verification completed successfully');
          return;
        }
        
        throw Exception('Address verification failed or was cancelled');
      }
      
      throw Exception('Failed to get Onfido token');
    } catch (e) {
      print('Address verification error: $e');
      rethrow;
    }
  }
}