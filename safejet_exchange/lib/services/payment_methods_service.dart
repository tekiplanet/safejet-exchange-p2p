import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../models/payment_method.dart';
import '../models/payment_method_type.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class PaymentMethodsService {
  final Dio _dio;
  final storage = const FlutterSecureStorage();

  PaymentMethodsService(this._dio);

  Future<Map<String, String>> _getAuthHeaders() async {
    final token = await storage.read(key: 'accessToken');
    return {
      'Authorization': 'Bearer $token',
    };
  }

  Future<List<PaymentMethod>> getPaymentMethods(BuildContext context) async {
    try {
      final response = await _dio.get(
        '/payment-methods',
        options: Options(
          headers: await _getAuthHeaders(),
          responseType: ResponseType.json,
        ),
      );

      if (response.data == null) {
        return [];
      }

      try {
        return (response.data as List)
            .map((json) => PaymentMethod.fromJson(Map<String, dynamic>.from(json)))
            .toList();
      } catch (e) {
        print('Error parsing payment methods: $e');
        print('Response data: ${response.data}');
        throw 'Failed to parse payment methods data';
      }
    } catch (e) {
      if (e is DioException) {
        if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
          await Provider.of<AuthProvider>(context, listen: false)
              .handleUnauthorized(context);
          throw 'Session expired';
        }
        final message = e.response?.data['message'];
        throw message ?? 'Failed to fetch payment methods';
      }
      print('Error getting payment methods: $e');
      throw 'Failed to fetch payment methods';
    }
  }

  Future<void> createPaymentMethod(Map<String, dynamic> data) async {
    try {
      await _dio.post(
        '/payment-methods',
        data: data,
        options: Options(headers: await _getAuthHeaders()),
      );
    } catch (e) {
      if (e is DioException) {
        if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
          throw 'Session expired';
        }
        throw e.response?.data['message'] ?? 'Failed to create payment method';
      }
      throw 'Failed to create payment method';
    }
  }

  Future<PaymentMethod> updatePaymentMethod(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch(
        '/payment-methods/$id',
        data: data,
        options: Options(headers: await _getAuthHeaders()),
      );

      return PaymentMethod.fromJson(response.data);
    } catch (e) {
      if (e is DioException) {
        final message = e.response?.data['message'];
        throw message ?? 'Failed to update payment method';
      }
      throw 'Failed to update payment method';
    }
  }

  Future<void> deletePaymentMethod(String id) async {
    try {
      await _dio.delete(
        '/payment-methods/$id',
        options: Options(headers: await _getAuthHeaders()),
      );
    } catch (e) {
      if (e is DioException) {
        final message = e.response?.data['message'];
        throw message ?? 'Failed to delete payment method';
      }
      throw 'Failed to delete payment method';
    }
  }

  Future<List<PaymentMethodType>> getPaymentMethodTypes(BuildContext context) async {
    try {
      final response = await _dio.get(
        '/payment-methods/types',
        options: Options(headers: await _getAuthHeaders()),
      );

      return (response.data as List)
          .map((json) => PaymentMethodType.fromJson(json))
          .toList();
    } catch (e) {
      if (e is DioException) {
        if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
          await Provider.of<AuthProvider>(context, listen: false)
              .handleUnauthorized(context);
          throw 'Session expired';
        }
        final message = e.response?.data['message'];
        throw message ?? 'Failed to fetch payment method types';
      }
      throw 'Failed to fetch payment method types';
    }
  }

  Future<PaymentMethodType> getPaymentMethodType(String id, BuildContext context) async {
    try {
      final response = await _dio.get(
        '/payment-methods/types/$id',
        options: Options(headers: await _getAuthHeaders()),
      );

      return PaymentMethodType.fromJson(response.data);
    } catch (e) {
      if (e is DioException) {
        if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
          await Provider.of<AuthProvider>(context, listen: false)
              .handleUnauthorized(context);
          throw 'Session expired';
        }
        final message = e.response?.data['message'];
        throw message ?? 'Failed to fetch payment method type';
      }
      throw 'Failed to fetch payment method type';
    }
  }
} 