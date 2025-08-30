# Mobile Developer Agent - Lifestyle Spaces Project Instructions

## Project Context
**Lifestyle Spaces** is a collaborative accountability platform currently implemented as a web application. The mobile app is a planned feature that will provide native iOS and Android experiences for users to manage their shared spaces and track goals on the go.

## Current Status
- **Web App**: ✅ Fully implemented with React + TypeScript
- **Mobile App**: 📋 Planned (not yet started)
- **Backend**: 🚧 API ready (needs mobile-specific endpoints)

## Technology Stack Decision

### Recommended Approach: React Native
Given the existing React web application, React Native is the recommended approach for mobile development.

**Advantages**:
- Code reuse from existing React components
- Shared TypeScript types and interfaces
- Familiar development patterns for the team
- Single codebase for iOS and Android
- Hot reload for faster development

### Alternative Considered: Flutter
Flutter was considered but React Native offers better synergy with the existing codebase.

## Architecture Plan

### Project Structure
```
lifestyle-spaces-mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Shared components
│   │   ├── auth/           # Authentication screens
│   │   └── spaces/         # Space management
│   ├── screens/            # Full screen components
│   ├── navigation/         # React Navigation setup
│   ├── services/           # API and external services
│   ├── stores/             # State management (Redux/Context)
│   ├── types/              # TypeScript definitions (shared)
│   ├── utils/              # Helper functions
│   └── constants/          # App constants
├── assets/                 # Images, fonts, etc.
├── ios/                    # iOS specific code
├── android/                # Android specific code
└── __tests__/             # Test files
```

## Core Features for MVP

### Phase 1: Authentication & Core (Weeks 1-2)
1. **Authentication Flow**
   - Sign In screen
   - Sign Up screen
   - Biometric authentication (Touch ID/Face ID)
   - Secure token storage (Keychain/Keystore)
   - Auto-login with refresh tokens

2. **Navigation Structure**
   - Bottom tab navigation
   - Stack navigation for flows
   - Deep linking support

### Phase 2: Space Management (Weeks 3-4)
1. **Dashboard**
   - List user's spaces
   - Pull-to-refresh
   - Search and filter
   - Create space button

2. **Space Details**
   - View space information
   - Member list
   - Recent activities
   - Quick actions menu

3. **Create/Edit Space**
   - Form with validation
   - Image upload for space avatar
   - Privacy settings

### Phase 3: Social Features (Weeks 5-6)
1. **Invitations**
   - Send invites via app
   - Share invite link
   - Accept/decline invitations
   - Push notifications for invites

2. **Member Management**
   - View member profiles
   - Change member roles
   - Remove members
   - Member activity status

### Phase 4: Engagement Features (Weeks 7-8)
1. **Activity Feed**
   - Post updates
   - Add photos
   - Like and comment
   - Real-time updates

2. **Notifications**
   - Push notifications setup
   - In-app notification center
   - Notification preferences
   - Badge count management

## Technical Implementation

### State Management
```typescript
// Use Redux Toolkit or Context API
interface AppState {
  auth: AuthState;
  spaces: SpaceState;
  notifications: NotificationState;
  ui: UIState;
}
```

### API Integration
```typescript
// Reuse existing API service with mobile adaptations
class MobileAPIService extends APIService {
  // Add mobile-specific headers
  // Handle offline scenarios
  // Implement request caching
}
```

### Navigation Setup
```typescript
// React Navigation v6
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## Platform-Specific Considerations

### iOS Requirements
- **Minimum iOS Version**: 13.0
- **Devices**: iPhone 6s and newer
- **Permissions**: Camera, Photo Library, Notifications
- **App Store Guidelines**: Follow Human Interface Guidelines

### Android Requirements
- **Minimum SDK**: 23 (Android 6.0)
- **Target SDK**: 33 (Android 13)
- **Permissions**: Camera, Storage, Notifications
- **Material Design**: Follow Material Design 3 guidelines

## Shared Code Strategy

### Reusable from Web
1. **Types & Interfaces** - Direct reuse
2. **API Services** - With mobile adaptations
3. **Business Logic** - Validation, formatting
4. **Constants** - API endpoints, configurations

### Mobile-Specific
1. **Navigation** - Native navigation patterns
2. **Components** - Native UI components
3. **Storage** - AsyncStorage/SecureStore
4. **Permissions** - Camera, notifications

## Design System Adaptation

### From Web to Mobile
```typescript
// Web CSS variables to React Native styles
const colors = {
  primary: '#007bff',
  primaryDark: '#0056b3',
  success: '#28a745',
  error: '#dc3545',
  // ... rest of color palette
};

const typography = {
  h1: { fontSize: 30, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: 'normal' },
  // ... rest of type scale
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
```

## Performance Optimization

### Key Metrics
- **App Launch**: < 2 seconds
- **Screen Transition**: < 300ms
- **List Scrolling**: 60 FPS
- **API Response**: Cache when possible

### Optimization Strategies
1. **Lazy Loading** - Load screens on demand
2. **Image Optimization** - Use appropriate formats and sizes
3. **List Virtualization** - FlashList for large lists
4. **Memoization** - Prevent unnecessary re-renders
5. **Bundle Splitting** - Hermes for Android

## Testing Strategy

### Testing Levels
1. **Unit Tests** - Jest for business logic
2. **Component Tests** - React Native Testing Library
3. **Integration Tests** - Detox for E2E testing
4. **Platform Tests** - iOS Simulator & Android Emulator

### Coverage Requirements
- **Minimum**: 80% code coverage
- **Critical Paths**: 100% coverage for auth and payments

## Offline Support

### Offline Capabilities
1. **View cached spaces**
2. **Queue actions for sync**
3. **Offline indicator**
4. **Sync on reconnection**

### Implementation
```typescript
// Using React Native Offline
import { NetworkProvider, useIsConnected } from 'react-native-offline';

function OfflineAwareComponent() {
  const isConnected = useIsConnected();
  
  if (!isConnected) {
    return <OfflineBanner />;
  }
  
  return <OnlineContent />;
}
```

## Security Considerations

### Data Protection
1. **Secure Storage** - Keychain/Keystore for tokens
2. **Certificate Pinning** - Prevent MITM attacks
3. **Biometric Auth** - Touch ID/Face ID
4. **Data Encryption** - Encrypt sensitive local data
5. **Code Obfuscation** - Protect source code

### Authentication Flow
```typescript
// Secure token management
import * as SecureStore from 'expo-secure-store';

async function saveToken(token: string) {
  await SecureStore.setItemAsync('auth_token', token);
}

async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('auth_token');
}
```

## Deployment Strategy

### Build & Release
1. **Development**: Expo Go for rapid testing
2. **Staging**: TestFlight (iOS) / Internal Testing (Android)
3. **Production**: App Store / Google Play Store

### CI/CD Pipeline
```yaml
# GitHub Actions for mobile
- Build iOS and Android
- Run tests
- Deploy to TestFlight/Play Console
- Monitor crash reports
```

## Analytics & Monitoring

### Key Metrics to Track
1. **User Engagement** - DAU/MAU
2. **Screen Views** - Navigation patterns
3. **API Performance** - Response times
4. **Crash Rate** - Target < 1%
5. **App Reviews** - Target 4.5+ stars

### Tools
- **Analytics**: Firebase Analytics
- **Crash Reporting**: Crashlytics
- **Performance**: Firebase Performance
- **A/B Testing**: Firebase Remote Config

## Future Enhancements

### Post-MVP Features
1. **Push Notifications** - Real-time updates
2. **Widgets** - iOS/Android home screen widgets
3. **Apple Watch** - Companion app
4. **Siri/Google Assistant** - Voice commands
5. **AR Features** - Visualize goals
6. **Social Sharing** - Share achievements

## Development Timeline

### Estimated Schedule (8 weeks)
- **Week 1-2**: Setup & Authentication
- **Week 3-4**: Core Features
- **Week 5-6**: Social Features
- **Week 7**: Testing & Polish
- **Week 8**: Beta Release

## Resources & Dependencies

### Required Libraries
```json
{
  "react-native": "0.72.x",
  "react-navigation": "6.x",
  "react-native-gesture-handler": "2.x",
  "react-native-reanimated": "3.x",
  "react-native-vector-icons": "10.x",
  "@tanstack/react-query": "5.x",
  "react-hook-form": "7.x",
  "react-native-keychain": "8.x"
}
```

### Development Setup
1. **React Native CLI** or **Expo**
2. **Xcode** for iOS development
3. **Android Studio** for Android
4. **VS Code** with React Native Tools
5. **Flipper** for debugging

## Success Criteria

### Launch Metrics
- [ ] Feature parity with web (core features)
- [ ] < 2% crash rate
- [ ] 4.0+ app store rating
- [ ] 80% test coverage
- [ ] < 50MB app size

Remember: **Mobile-first doesn't mean web-last. Create a seamless experience across all platforms.**