import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';
import '../../services/kyc_service.dart';
import 'package:country_state_city_picker/country_state_city_picker.dart';
import '../../widgets/verification_status_card.dart';
import '../../providers/kyc_provider.dart';
import '../../models/kyc_details.dart';
import 'package:country_picker/country_picker.dart';
import '../../providers/auth_provider.dart';
import 'dart:convert';
import 'package:flutter/cupertino.dart';

class IdentityVerificationScreen extends StatefulWidget {
  const IdentityVerificationScreen({super.key});

  @override
  State<IdentityVerificationScreen> createState() => _IdentityVerificationScreenState();
}

class _IdentityVerificationScreenState extends State<IdentityVerificationScreen> {
  int _currentStep = 0;
  bool _isLoading = false;
  final _formKey = GlobalKey<FormState>();
  KYCDetails? kycDetails;
  
  // Personal Information
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _dobController = TextEditingController();
  final _addressController = TextEditingController();
  String? _selectedDocType;
  String? _selectedCountry;
  String? _selectedState;
  String? _selectedCity;
  List<String> _states = [];
  List<String> _cities = [];
  
  final List<String> _documentTypes = [
    'Passport',
    'National ID Card',
    'Driver\'s License',
  ];

  // Add map to store country data
  List<dynamic>? _countryData;

  // Add controllers for search
  final TextEditingController _stateSearchController = TextEditingController();
  final TextEditingController _citySearchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadKYCDetails();
    _loadUserDetails();
    _loadCountryData();
  }

  Future<void> _loadUserDetails() async {
    try {
      final provider = context.read<AuthProvider>();
      final user = await provider.getCurrentUser();
      final fullName = user['fullName'] as String;
      final names = fullName.split(' ');
      
      setState(() {
        _firstNameController.text = names.first;
        _lastNameController.text = names.length > 1 ? names.sublist(1).join(' ') : '';
      });
    } catch (e) {
      print('Error loading user details: $e');
    }
  }

  Future<void> _loadKYCDetails() async {
    final provider = context.read<KYCProvider>();
    await provider.loadKYCDetails();
    setState(() {
      kycDetails = provider.kycDetails;
    });
  }

  Future<void> _loadCountryData() async {
    try {
      print('Loading country data...');
      final String data = await DefaultAssetBundle.of(context)
          .loadString('packages/country_state_city_picker/lib/assets/country.json');
      
      final decoded = json.decode(data) as List<dynamic>;
      print('Decoded data structure: ${decoded.runtimeType}');
      
      setState(() {
        _countryData = decoded;
      });
    } catch (e, stackTrace) {
      print('Error loading country data: $e\nStack trace: $stackTrace');
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _dobController.dispose();
    _addressController.dispose();
    _stateSearchController.dispose();
    _citySearchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);
    final provider = context.watch<KYCProvider>();
    kycDetails = provider.kycDetails;

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
              onTap: () => _selectDate(context),
            ),
            const SizedBox(height: 16),
            _buildInputField(
              controller: _addressController,
              label: 'Address',
              icon: Icons.home_outlined,
              isDark: isDark,
            ),
            const SizedBox(height: 16),
            _buildDropdownField(
              label: 'Country',
              value: _selectedCountry,
              hint: 'Select Country',
              icon: Icons.public,
              onTap: () {
                showCountryPicker(
                  context: context,
                  showPhoneCode: false,
                  onSelect: (Country country) {
                    setState(() {
                      _selectedCountry = country.name;
                      _selectedState = null;
                      _selectedCity = null;
                      _states = _getStates(country.name);
                      _cities = [];
                    });
                  },
                );
              },
            ),
            const SizedBox(height: 16),
            _buildDropdownField(
              label: 'State/Province',
              value: _selectedState,
              hint: 'Select State',
              icon: Icons.map,
              enabled: _selectedCountry != null,
              onTap: () {
                _showStatesPicker();
              },
            ),
            const SizedBox(height: 16),
            _buildDropdownField(
              label: 'City',
              value: _selectedCity,
              hint: 'Select City',
              icon: Icons.location_city,
              enabled: _selectedState != null,
              onTap: () {
                _showCitiesPicker();
              },
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

  Widget _buildDropdownField({
    required String label,
    required String? value,
    required String hint,
    required IconData icon,
    bool enabled = true,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isDark
              ? SafeJetColors.primaryAccent.withOpacity(0.1)
              : SafeJetColors.lightCardBackground,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: enabled 
                ? SafeJetColors.primaryAccent.withOpacity(0.2)
                : Colors.grey.withOpacity(0.2),
          ),
        ),
        child: ListTile(
          leading: Icon(
            icon,
            color: enabled 
                ? Theme.of(context).iconTheme.color 
                : Colors.grey,
          ),
          title: Text(
            value ?? hint,
            style: TextStyle(
              color: value == null 
                  ? Colors.grey 
                  : Theme.of(context).textTheme.bodyLarge?.color,
            ),
          ),
          enabled: enabled,
        ),
      ),
    );
  }

  void _showStatesPicker() {
    if (_selectedCountry == null) return;
    
    final states = _getStates(_selectedCountry!);
    if (states.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No states found for selected country'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    List<String> filteredStates = states;

    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          height: MediaQuery.of(context).size.height * 0.7,
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.only(bottom: 20),
                width: 50,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(5),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'Select State',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: CupertinoSearchTextField(
                  controller: _stateSearchController,
                  onChanged: (value) {
                    setModalState(() {
                      filteredStates = states
                          .where((state) => state.toLowerCase()
                              .contains(value.toLowerCase()))
                          .toList();
                    });
                  },
                  style: TextStyle(
                    color: Theme.of(context).textTheme.bodyLarge?.color,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (filteredStates.isEmpty) 
                Expanded(
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.search_off,
                          size: 48,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No states found',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                Expanded(
                  child: ListView.builder(
                    itemCount: filteredStates.length,
                    itemBuilder: (context, index) => ListTile(
                      title: Text(filteredStates[index]),
                      onTap: () {
                        setState(() {
                          _selectedState = filteredStates[index];
                          _selectedCity = null;
                          _cities = _getCities(_selectedCountry!, filteredStates[index]);
                        });
                        _stateSearchController.clear();
                        Navigator.pop(context);
                      },
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCitiesPicker() {
    if (_selectedState == null) return;
    
    final cities = _getCities(_selectedCountry!, _selectedState!);
    if (cities.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No cities found for selected state'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    List<String> filteredCities = cities;

    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          height: MediaQuery.of(context).size.height * 0.7,
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.only(bottom: 20),
                width: 50,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(5),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'Select City',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: CupertinoSearchTextField(
                  controller: _citySearchController,
                  onChanged: (value) {
                    setModalState(() {
                      filteredCities = cities
                          .where((city) => city.toLowerCase()
                              .contains(value.toLowerCase()))
                          .toList();
                    });
                  },
                  style: TextStyle(
                    color: Theme.of(context).textTheme.bodyLarge?.color,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (filteredCities.isEmpty) 
                Expanded(
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.search_off,
                          size: 48,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No cities found',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                Expanded(
                  child: ListView.builder(
                    itemCount: filteredCities.length,
                    itemBuilder: (context, index) => ListTile(
                      title: Text(filteredCities[index]),
                      onTap: () {
                        setState(() {
                          _selectedCity = filteredCities[index];
                        });
                        _citySearchController.clear();
                        Navigator.pop(context);
                      },
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  List<String> _getStates(String country) {
    try {
      if (_countryData == null) {
        print('Country data is null');
        return [];
      }
      
      print('Getting states for country: $country');
      
      final countryData = _countryData!.firstWhere(
        (c) => c['name'] == country,
        orElse: () => null,
      );
      
      if (countryData == null) {
        print('No data found for country: $country');
        return [];
      }
      
      final states = (countryData['state'] as List)
          .map((state) => state['name'].toString())
          .toList();
      
      // Sort states alphabetically
      states.sort((a, b) => a.compareTo(b));
      
      print('Found states: $states');
      return states;
    } catch (e, stackTrace) {
      print('Error getting states: $e\nStack trace: $stackTrace');
      return [];
    }
  }

  List<String> _getCities(String country, String state) {
    try {
      if (_countryData == null) {
        print('Country data is null');
        return [];
      }
      
      print('Getting cities for country: $country, state: $state');
      
      final countryData = _countryData!.firstWhere(
        (c) => c['name'] == country,
        orElse: () => null,
      );
      
      if (countryData == null) {
        print('No data found for country: $country');
        return [];
      }
      
      final stateData = (countryData['state'] as List).firstWhere(
        (s) => s['name'] == state,
        orElse: () => null,
      );
      
      if (stateData == null) {
        print('No data found for state: $state');
        return [];
      }
      
      final cities = (stateData['city'] as List)
          .map((city) => city['name'].toString())
          .toList();
      
      // Sort cities alphabetically
      cities.sort((a, b) => a.compareTo(b));
      
      print('Found cities: $cities');
      return cities;
    } catch (e, stackTrace) {
      print('Error getting cities: $e\nStack trace: $stackTrace');
      return [];
    }
  }

  Widget _buildDocumentStep(bool isDark) {
    return FadeInUp(
      duration: const Duration(milliseconds: 300),
      child: Column(
        children: [
          if (kycDetails != null) ...[
            if (kycDetails!.identityVerificationStatus != null)
              VerificationStatusCard(
                type: 'Identity',
                status: kycDetails!.identityVerificationStatus!.status,
                documentType: kycDetails!.identityVerificationStatus!.documentType,
                failureReason: kycDetails!.identityVerificationStatus!.failureReason,
                lastAttempt: kycDetails!.identityVerificationStatus!.lastAttempt,
                onRetry: kycDetails!.identityVerificationStatus!.status == 'failed'
                  ? () => _handleRetryVerification('identity')
                  : null,
              ),
            const SizedBox(height: 16),
            if (kycDetails!.addressVerificationStatus != null)
              VerificationStatusCard(
                type: 'Address',
                status: kycDetails!.addressVerificationStatus!.status,
                documentType: kycDetails!.addressVerificationStatus!.documentType,
                failureReason: kycDetails!.addressVerificationStatus!.failureReason,
                lastAttempt: kycDetails!.addressVerificationStatus!.lastAttempt,
                onRetry: kycDetails!.addressVerificationStatus!.status == 'failed'
                  ? () => _handleRetryVerification('address')
                  : null,
              ),
            const SizedBox(height: 24),
          ],
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

  void _handlePersonalInfoSubmit() async {
    if (_formKey.currentState!.validate() &&
        _selectedCountry != null &&
        _selectedState != null &&
        _selectedCity != null) {
      final kycService = context.read<KYCProvider>();
      try {
        await kycService.submitIdentityDetails(
          firstName: _firstNameController.text,
          lastName: _lastNameController.text,
          dateOfBirth: _dobController.text,
          address: _addressController.text,
          city: _selectedCity!,
          state: _selectedState!,
          country: _selectedCountry!,
        );
        setState(() => _currentStep = 1);
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save identity details: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select country, state and city'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _handleDocumentSubmit() async {
    try {
      if (_selectedDocType == 'Passport' || _selectedDocType == 'National ID Card') {
        await context.read<KYCProvider>().startDocumentVerification();
      }
      await context.read<KYCProvider>().startAddressVerification();
      setState(() => _currentStep = 2);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Verification failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _handleRetryVerification(String type) async {
    try {
      setState(() => _isLoading = true);
      
      if (type == 'identity') {
        await context.read<KYCProvider>().startDocumentVerification();
      } else if (type == 'address') {
        await context.read<KYCProvider>().startAddressVerification();
      }

      // Refresh KYC details after retry
      await context.read<KYCProvider>().loadKYCDetails();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Verification restarted successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to restart verification: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  // Date picker method
  Future<void> _selectDate(BuildContext context) async {
    final DateTime now = DateTime.now();
    final DateTime minAge = now.subtract(const Duration(days: 6570)); // 18 years ago
    final DateTime maxAge = now.subtract(const Duration(days: 36500)); // 100 years ago

    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: minAge,
      firstDate: maxAge,
      lastDate: minAge,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: SafeJetColors.secondaryHighlight,
              onPrimary: Colors.white,
              surface: Theme.of(context).scaffoldBackgroundColor,
              onSurface: Theme.of(context).textTheme.bodyLarge!.color!,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _dobController.text = '${picked.day}/${picked.month}/${picked.year}';
      });
    }
  }
} 