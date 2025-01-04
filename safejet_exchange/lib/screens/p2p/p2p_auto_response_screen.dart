import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';

class P2PAutoResponseScreen extends StatefulWidget {
  const P2PAutoResponseScreen({super.key});

  @override
  State<P2PAutoResponseScreen> createState() => _P2PAutoResponseScreenState();
}

class _P2PAutoResponseScreenState extends State<P2PAutoResponseScreen> {
  final List<Map<String, dynamic>> _responses = [
    {
      'id': '1',
      'message': 'I have made the payment, please check.',
      'type': 'Payment',
      'icon': Icons.payment,
      'color': const Color(0xFF4CAF50),
    },
    {
      'id': '2',
      'message': 'Please provide your payment details.',
      'type': 'Request',
      'icon': Icons.request_page,
      'color': Color(0xFF2196F3),
    },
    {
      'id': '3',
      'message': 'Payment received, releasing crypto now.',
      'type': 'Confirmation',
      'icon': Icons.check_circle,
      'color': Color(0xFF9C27B0),
    },
    {
      'id': '4',
      'message': 'Thank you for trading with me!',
      'type': 'Thanks',
      'icon': Icons.favorite,
      'color': Color(0xFFE91E63),
    },
  ];

  final _messageController = TextEditingController();
  final _typeController = TextEditingController();
  IconData? _selectedIcon;
  Color _selectedColor = const Color(0xFF4CAF50);

  final List<Map<String, dynamic>> _availableIcons = [
    {'icon': Icons.payment, 'label': 'Payment'},
    {'icon': Icons.request_page, 'label': 'Request'},
    {'icon': Icons.check_circle, 'label': 'Confirmation'},
    {'icon': Icons.favorite, 'label': 'Thanks'},
    {'icon': Icons.warning, 'label': 'Warning'},
    {'icon': Icons.info, 'label': 'Info'},
  ];

  final List<Color> _availableColors = [
    const Color(0xFF4CAF50),
    const Color(0xFF2196F3),
    const Color(0xFF9C27B0),
    const Color(0xFFE91E63),
    const Color(0xFFFFC107),
    const Color(0xFF607D8B),
  ];

  @override
  void dispose() {
    _messageController.dispose();
    _typeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: 'Quick Responses',
        hasNotification: false,
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: Column(
        children: [
          _buildHeader(isDark),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _responses.length,
              itemBuilder: (context, index) {
                return FadeInUp(
                  duration: const Duration(milliseconds: 300),
                  delay: Duration(milliseconds: index * 100),
                  child: _buildResponseCard(_responses[index], isDark),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddResponseDialog(isDark),
        backgroundColor: SafeJetColors.secondaryHighlight,
        icon: const Icon(Icons.add),
        label: const Text('New Response'),
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
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? SafeJetColors.primaryAccent.withOpacity(0.2)
                : SafeJetColors.lightCardBorder,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: SafeJetColors.secondaryHighlight.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.quickreply,
                  color: SafeJetColors.secondaryHighlight,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Quick Responses',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Manage your automated chat responses',
                      style: TextStyle(
                        color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildResponseCard(Map<String, dynamic> response, bool isDark) {
    return Dismissible(
      key: Key(response['id']),
      background: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: SafeJetColors.error,
          borderRadius: BorderRadius.circular(16),
        ),
        alignment: Alignment.centerRight,
        child: const Icon(
          Icons.delete_outline,
          color: Colors.white,
        ),
      ),
      direction: DismissDirection.endToStart,
      onDismissed: (direction) {
        setState(() {
          _responses.remove(response);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Response deleted'),
            action: SnackBarAction(
              label: 'Undo',
              onPressed: () {
                setState(() {
                  _responses.add(response);
                });
              },
            ),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: isDark
              ? SafeJetColors.primaryAccent.withOpacity(0.1)
              : SafeJetColors.lightCardBackground,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark
                ? SafeJetColors.primaryAccent.withOpacity(0.2)
                : SafeJetColors.lightCardBorder,
          ),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => _showEditResponseDialog(response, isDark),
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: response['color'].withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          response['icon'],
                          color: response['color'],
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: response['color'].withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          response['type'],
                          style: TextStyle(
                            color: response['color'],
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        onPressed: () => _showEditResponseDialog(response, isDark),
                        icon: const Icon(Icons.edit_outlined),
                        iconSize: 20,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    response['message'],
                    style: const TextStyle(
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showAddResponseDialog(bool isDark) {
    _messageController.clear();
    _typeController.clear();
    _selectedIcon = _availableIcons[0]['icon'] as IconData;
    _selectedColor = _availableColors[0];
    
    _showResponseDialog(
      isDark,
      isEdit: false,
      onSave: (message, type) {
        setState(() {
          _responses.add({
            'id': DateTime.now().toString(),
            'message': message,
            'type': type,
            'icon': _selectedIcon ?? Icons.message,
            'color': _selectedColor,
          });
        });
      },
    );
  }

  void _showEditResponseDialog(Map<String, dynamic> response, bool isDark) {
    _messageController.text = response['message'];
    _typeController.text = response['type'];
    _selectedIcon = response['icon'] as IconData;
    _selectedColor = response['color'] as Color;
    
    _showResponseDialog(
      isDark,
      isEdit: true,
      onSave: (message, type) {
        setState(() {
          response['message'] = message;
          response['type'] = type;
          response['icon'] = _selectedIcon ?? Icons.message;
          response['color'] = _selectedColor;
        });
      },
    );
  }

  void _showResponseDialog(
    bool isDark, {
    required bool isEdit,
    required Function(String message, String type) onSave,
  }) {
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(isEdit ? 'Edit Response' : 'Add Response'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _messageController,
                  decoration: InputDecoration(
                    labelText: 'Message',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _typeController,
                  decoration: InputDecoration(
                    labelText: 'Type',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Select Icon',
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 56,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _availableIcons.length,
                    itemBuilder: (context, index) {
                      final icon = _availableIcons[index]['icon'] as IconData;
                      final isSelected = icon == _selectedIcon;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: InkWell(
                          onTap: () {
                            setDialogState(() {
                              _selectedIcon = icon;
                            });
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            width: 56,
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? _selectedColor.withOpacity(0.2)
                                  : isDark
                                      ? Colors.white.withOpacity(0.05)
                                      : Colors.black.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(8),
                              border: isSelected
                                  ? Border.all(color: _selectedColor)
                                  : null,
                            ),
                            child: Icon(
                              icon,
                              color: isSelected ? _selectedColor : null,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Select Color',
                  style: TextStyle(
                    color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 56,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _availableColors.length,
                    itemBuilder: (context, index) {
                      final color = _availableColors[index];
                      final isSelected = color == _selectedColor;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: InkWell(
                          onTap: () {
                            setDialogState(() {
                              _selectedColor = color;
                            });
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            width: 56,
                            decoration: BoxDecoration(
                              color: color.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                              border: isSelected
                                  ? Border.all(color: color)
                                  : null,
                            ),
                            child: Center(
                              child: Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  color: color,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                if (_messageController.text.isNotEmpty && _typeController.text.isNotEmpty) {
                  onSave(_messageController.text, _typeController.text);
                  Navigator.pop(context);
                }
              },
              style: TextButton.styleFrom(
                foregroundColor: SafeJetColors.secondaryHighlight,
              ),
              child: Text(isEdit ? 'Save' : 'Add'),
            ),
          ],
        ),
      ),
    );
  }
} 