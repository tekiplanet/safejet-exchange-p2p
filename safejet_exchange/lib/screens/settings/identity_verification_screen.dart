import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';

class IdentityVerificationScreen extends StatefulWidget {
  const IdentityVerificationScreen({super.key});

  @override
  State<IdentityVerificationScreen> createState() => _IdentityVerificationScreenState();
}

class _IdentityVerificationScreenState extends State<IdentityVerificationScreen> {
  int _currentStep = 0;
  bool _isLoading = false;
  final _formKey = GlobalKey<FormState>();
  
  // Personal Information
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _dobController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _countryController = TextEditingController();
  String? _selectedDocType;
  
  final List<String> _documentTypes = [
    'Passport',
    'National ID Card',
    'Driver\'s License',
  ];

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _dobController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _countryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: 'Identity Verification',
        hasNotification: false,
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(isDark),
            Expanded(
              child: SingleChildScrollView(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _buildProgressIndicator(isDark),
                      const SizedBox(height: 24),
                      _buildCurrentStep(isDark),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: const BorderRadius.vertical(
          bottom: Radius.circular(24),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: SafeJetColors.secondaryHighlight.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.verified_user,
              color: SafeJetColors.secondaryHighlight,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Identity Verification',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'Complete verification to increase limits',
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator(bool isDark) {
    final steps = ['Personal Info', 'Document', 'Verification'];
    return Row(
      children: steps.asMap().entries.map((entry) {
        final index = entry.key;
        final title = entry.value;
        final isActive = index <= _currentStep;
        
        return Expanded(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: isActive
                            ? SafeJetColors.secondaryHighlight
                            : (isDark ? Colors.grey[800] : Colors.grey[300]),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        _getStepIcon(index),
                        color: isActive ? Colors.white : Colors.grey,
                        size: 20,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      title,
                      style: TextStyle(
                        color: isActive
                            ? (isDark ? Colors.white : Colors.black)
                            : Colors.grey,
                        fontSize: 12,
                        fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
              if (index < steps.length - 1)
                Expanded(
                  child: Container(
                    height: 2,
                    color: isActive
                        ? SafeJetColors.secondaryHighlight
                        : (isDark ? Colors.grey[800] : Colors.grey[300]),
                  ),
                ),
            ],
          ),
        );
      }).toList(),
    );
  }

  IconData _getStepIcon(int step) {
    switch (step) {
      case 0:
        return Icons.person_outline;
      case 1:
        return Icons.document_scanner;
      case 2:
        return Icons.verified_outlined;
      default:
        return Icons.circle;
    }
  }

  Widget _buildCurrentStep(bool isDark) {
    switch (_currentStep) {
      case 0:
        return _buildPersonalInfoStep(isDark);
      case 1:
        return _buildDocumentStep(isDark);
      case 2:
        return _buildVerificationStep(isDark);
      default:
        return const SizedBox();
    }
  }

  Widget _buildPersonalInfoStep(bool isDark) {
    return FadeInUp(
      duration: const Duration(milliseconds: 300),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildInputField(
              controller: _firstNameController,
              label: 'First Name',
              icon: Icons.person_outline,
              isDark: isDark,
            ),
            const SizedBox(height: 16),
            _buildInputField(
              controller: _lastNameController,
              label: 'Last Name',
              icon: Icons.person_outline,
              isDark: isDark,
            ),
            const SizedBox(height: 16),
            _buildInputField(
              controller: _dobController,
              label: 'Date of Birth',
              icon: Icons.calendar_today,
              isDark: isDark,
              readOnly: true,
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: DateTime.now().subtract(const Duration(days: 6570)), // 18 years ago
                  firstDate: DateTime.now().subtract(const Duration(days: 36500)), // 100 years ago
                  lastDate: DateTime.now().subtract(const Duration(days: 6570)), // 18 years ago
                );
                if (date != null) {
                  _dobController.text = '${date.day}/${date.month}/${date.year}';
                }
              },
            ),
            const SizedBox(height: 16),
            _buildInputField(
              controller: _addressController,
              label: 'Address',
              icon: Icons.home_outlined,
              isDark: isDark,
            ),
            const SizedBox(height: 16),
            _buildInputField(
              controller: _cityController,
              label: 'City',
              icon: Icons.location_city,
              isDark: isDark,
            ),
            const SizedBox(height: 16),
            _buildInputField(
              controller: _countryController,
              label: 'Country',
              icon: Icons.public,
              isDark: isDark,
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _handlePersonalInfoSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: SafeJetColors.secondaryHighlight,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  'Continue',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDocumentStep(bool isDark) {
    return FadeInUp(
      duration: const Duration(milliseconds: 300),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Select Document Type',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 16),
          ..._documentTypes.map((type) => _buildDocumentTypeCard(type, isDark)),
          const SizedBox(height: 32),
          if (_selectedDocType != null) ...[
            _buildDocumentUploadSection('Front Side', isDark),
            const SizedBox(height: 16),
            _buildDocumentUploadSection('Back Side', isDark),
            const SizedBox(height: 16),
            _buildDocumentUploadSection('Selfie with Document', isDark),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _handleDocumentSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: SafeJetColors.secondaryHighlight,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  'Submit Documents',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDocumentTypeCard(String type, bool isDark) {
    final isSelected = type == _selectedDocType;
    return GestureDetector(
      onTap: () => setState(() => _selectedDocType = type),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? SafeJetColors.secondaryHighlight.withOpacity(0.1)
              : (isDark
                  ? SafeJetColors.primaryAccent.withOpacity(0.1)
                  : SafeJetColors.lightCardBackground),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? SafeJetColors.secondaryHighlight
                : Colors.transparent,
          ),
        ),
        child: Row(
          children: [
            Icon(
              _getDocumentIcon(type),
              color: isSelected
                  ? SafeJetColors.secondaryHighlight
                  : (isDark ? Colors.grey[400] : Colors.grey[600]),
            ),
            const SizedBox(width: 16),
            Text(
              type,
              style: TextStyle(
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected
                    ? SafeJetColors.secondaryHighlight
                    : (isDark ? Colors.white : Colors.black),
              ),
            ),
            const Spacer(),
            if (isSelected)
              const Icon(
                Icons.check_circle,
                color: SafeJetColors.secondaryHighlight,
              ),
          ],
        ),
      ),
    );
  }

  IconData _getDocumentIcon(String type) {
    switch (type) {
      case 'Passport':
        return Icons.book_outlined;
      case 'National ID Card':
        return Icons.credit_card;
      case 'Driver\'s License':
        return Icons.drive_eta_outlined;
      default:
        return Icons.document_scanner;
    }
  }

  Widget _buildDocumentUploadSection(String title, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? SafeJetColors.primaryAccent.withOpacity(0.2)
              : SafeJetColors.lightCardBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: OutlinedButton.icon(
              onPressed: () {
                // TODO: Implement document upload
              },
              icon: const Icon(Icons.cloud_upload),
              label: const Text('Upload Image'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVerificationStep(bool isDark) {
    return FadeInUp(
      duration: const Duration(milliseconds: 300),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark
                  ? SafeJetColors.primaryAccent.withOpacity(0.1)
                  : SafeJetColors.lightCardBackground,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                const Icon(
                  Icons.check_circle_outline,
                  size: 64,
                  color: SafeJetColors.success,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Documents Submitted',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Your documents are being reviewed. This process typically takes 1-3 business days.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          OutlinedButton(
            onPressed: () => Navigator.pop(context),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(
                horizontal: 32,
                vertical: 16,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text('Back to Profile'),
          ),
        ],
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required bool isDark,
    bool readOnly = false,
    VoidCallback? onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        borderRadius: BorderRadius.circular(12),
      ),
      child: TextFormField(
        controller: controller,
        readOnly: readOnly,
        onTap: onTap,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Colors.transparent,
        ),
        validator: (value) {
          if (value == null || value.isEmpty) {
            return 'This field is required';
          }
          return null;
        },
      ),
    );
  }

  void _handlePersonalInfoSubmit() {
    if (_formKey.currentState!.validate()) {
      setState(() => _currentStep = 1);
    }
  }

  void _handleDocumentSubmit() {
    // TODO: Implement document submission
    setState(() => _currentStep = 2);
  }
} 