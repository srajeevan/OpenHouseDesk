'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { adminLoginSchema, adminSignUpSchema, type AdminLoginData, type AdminSignUpData } from '@/lib/validations'
import { createClientComponentClient } from '@/lib/supabase'

export default function AdminLoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const loginForm = useForm<AdminLoginData>({
    resolver: zodResolver(adminLoginSchema),
  })

  const signUpForm = useForm<AdminSignUpData>({
    resolver: zodResolver(adminSignUpSchema),
  })

  const currentForm = isSignUp ? signUpForm : loginForm

  const onSubmit = async (data: AdminLoginData | AdminSignUpData) => {
    setIsSubmitting(true)
    
    try {
      if (isSignUp) {
        const signUpData = data as AdminSignUpData
        
        // First check if user already exists
        const { data: existingUser } = await supabase.auth.signInWithPassword({
          email: signUpData.email,
          password: signUpData.password,
        })

        if (existingUser.user) {
          // User exists and password is correct, check if admin record exists
          const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('user_id', existingUser.user.id)
            .single()

          if (adminError || !adminData) {
            // User exists but no admin record, create admin record
            const adminRecord = {
              user_id: existingUser.user.id,
              first_name: signUpData.firstName,
              last_name: signUpData.lastName,
              email: signUpData.email,
              created_at: new Date().toISOString()
            }
            
            const { data: insertData, error: insertError } = await supabase
              .from('admins')
              .insert([adminRecord])
              .select()

            if (insertError) {
              console.error('Error creating admin record:', insertError)
              toast.error(`Failed to create admin record: ${insertError.message}`)
              return
            }

            toast.success('Admin privileges added to existing account! You can now login.')
            setIsSignUp(false)
            signUpForm.reset()
            return
          } else {
            toast.error('This email is already registered as an admin. Please use the login form.')
            return
          }
        }

        // User doesn't exist or password is wrong, try to sign up
        const { data: authData, error } = await supabase.auth.signUp({
          email: signUpData.email,
          password: signUpData.password,
          options: {
            data: {
              role: 'admin',
              first_name: signUpData.firstName,
              last_name: signUpData.lastName
            }
          }
        })

        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('This email is already registered. If you forgot your password, please contact support.')
            return
          }
          throw error
        }

        if (authData.user) {
          // Insert admin record into admins table
          console.log('Attempting to insert admin record for user:', authData.user.id)
          
          const adminRecord = {
            user_id: authData.user.id,
            first_name: signUpData.firstName,
            last_name: signUpData.lastName,
            email: signUpData.email,
            created_at: new Date().toISOString()
          }
          
          console.log('Admin record to insert:', adminRecord)
          
          const { data: insertData, error: adminError } = await supabase
            .from('admins')
            .insert([adminRecord])
            .select()

          if (adminError) {
            console.error('Error creating admin record:', adminError)
            toast.error(`Failed to create admin record: ${adminError.message}`)
            // Don't return here, still show success for auth creation
          } else {
            console.log('Admin record created successfully:', insertData)
          }

          if (authData.user.email_confirmed_at) {
            toast.success('Account created successfully! You can now login.')
          } else {
            toast.success('Account created successfully! Please check your email to verify your account.')
          }
          setIsSignUp(false)
          signUpForm.reset()
        }
      } else {
        const loginData = data as AdminLoginData
        // Sign in existing admin
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: loginData.email,
          password: loginData.password,
        })

        if (error) {
          throw error
        }

        if (authData.user) {
          // Check if user is an admin
          const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('user_id', authData.user.id)
            .single()

          if (adminError || !adminData) {
            await supabase.auth.signOut()
            throw new Error('Access denied. Admin privileges required.')
          }

          toast.success('Login successful!')
          router.push('/admin/dashboard')
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      toast.error(error.message || 'Authentication failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleModeSwitch = () => {
    setIsSignUp(!isSignUp)
    loginForm.reset()
    signUpForm.reset()
  }

  return (
    <form onSubmit={currentForm.handleSubmit(onSubmit)} className="space-y-6">
      {isSignUp && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-200 mb-2">
                First Name
              </label>
              <input
                {...signUpForm.register('firstName')}
                type="text"
                id="firstName"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="First name"
              />
              {signUpForm.formState.errors.firstName && (
                <p className="mt-1 text-sm text-red-400">{signUpForm.formState.errors.firstName.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-200 mb-2">
                Last Name
              </label>
              <input
                {...signUpForm.register('lastName')}
                type="text"
                id="lastName"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Last name"
              />
              {signUpForm.formState.errors.lastName && (
                <p className="mt-1 text-sm text-red-400">{signUpForm.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>
        </>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
          Email Address
        </label>
        <input
          {...(isSignUp ? signUpForm.register('email') : loginForm.register('email'))}
          type="email"
          id="email"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="Enter your admin email"
        />
        {(isSignUp ? signUpForm.formState.errors.email : loginForm.formState.errors.email) && (
          <p className="mt-1 text-sm text-red-400">
            {(isSignUp ? signUpForm.formState.errors.email?.message : loginForm.formState.errors.email?.message)}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
          Password
        </label>
        <input
          {...(isSignUp ? signUpForm.register('password') : loginForm.register('password'))}
          type="password"
          id="password"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="Enter your password"
        />
        {(isSignUp ? signUpForm.formState.errors.password : loginForm.formState.errors.password) && (
          <p className="mt-1 text-sm text-red-400">
            {(isSignUp ? signUpForm.formState.errors.password?.message : loginForm.formState.errors.password?.message)}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-4 rounded-lg hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {isSignUp ? 'Creating Account...' : 'Signing In...'}
          </div>
        ) : (
          isSignUp ? 'Create Admin Account' : 'Sign In'
        )}
      </button>

      <div className="text-center space-y-4">
        <button
          type="button"
          onClick={handleModeSwitch}
          className="text-sm text-gray-300 hover:text-white transition-colors underline"
        >
          {isSignUp 
            ? 'Already have an account? Sign In' 
            : 'Need an admin account? Sign Up'
          }
        </button>
        
        {!isSignUp && (
          <p className="text-sm text-gray-400">
            Demo credentials: admin@example.com / password123
          </p>
        )}
      </div>
    </form>
  )
}
