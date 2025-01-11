import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../models/payment_method.dart';
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
        options: Options(headers: await _getAuthHeaders()),
      );

      return (response.data as List)
          .map((json) => PaymentMethod.fromJson(json))
          .toList();
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
      throw 'Failed to fetch payment methods';
    }
  }

  Future<PaymentMethod> createPaymentMethod(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(
        '/payment-methods',
        data: data,
        options: Options(headers: await _getAuthHeaders()),
      );

      return PaymentMethod.fromJson(response.data);
    } catch (e) {
      if (e is DioException) {
        final message = e.response?.data['message'];
        throw message ?? 'Failed to create payment method';
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
} 