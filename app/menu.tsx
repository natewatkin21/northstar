/**
 * Menu Screen
 * 
 * Full screen menu with navigation options and logout functionality.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import React from 'react'
import { useRouter, Stack } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { FontAwesome5 } from '@expo/vector-icons'

type MenuItem = {
  title: string
  icon: string
  route: string
  action?: () => void
}

export default function MenuScreen() {
  const router = useRouter()
  const { signOut } = useAuth()

  const menuItems: MenuItem[] = [
    {
      title: 'My Plans',
      icon: 'dumbbell',
      route: '/plans'
    },
    {
      title: 'Exercise Library',
      icon: 'book',
      route: '/exercises'
    },
    {
      title: 'Settings',
      icon: 'cog',
      route: '/settings'
    },
    {
      title: 'Log Out',
      icon: 'sign-out-alt',
      route: '',
      action: async () => {
        try {
          await signOut()
          router.replace('/')
        } catch (error) {
          console.error('Error signing out:', error)
        }
      }
    }
  ]

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.action) {
      item.action()
    } else {
      router.push(item.route)
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: false
        }}
      />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.push('/')}
          style={styles.backButton}
        >
          <FontAwesome5 name="chevron-left" size={16} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu</Text>
      </View>

      <View style={styles.menuItems}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.title}
            style={[
              styles.menuItem,
              index === menuItems.length - 1 && styles.lastMenuItem
            ]}
            onPress={() => handleMenuItemPress(item)}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                <FontAwesome5 
                  name={item.icon} 
                  size={20} 
                  color={item.title === 'Log Out' ? '#FF3B30' : '#007AFF'}
                  style={styles.menuItemIcon}
                />
                <Text 
                  style={[
                    styles.menuItemText,
                    item.title === 'Log Out' && styles.logoutText
                  ]}
                >
                  {item.title}
                </Text>
              </View>
              {item.route && (
                <FontAwesome5 
                  name="chevron-right" 
                  size={16} 
                  color="#999"
                />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,  // To offset the back button width and keep title centered
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginLeft: 8,
  },
  backText: {
    color: '#007AFF',
    marginLeft: 4,
    fontSize: 17,
  },
  menuItems: {
    marginTop: 0,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIcon: {
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#000',
  },
  logoutText: {
    color: '#FF3B30',
  },
})
