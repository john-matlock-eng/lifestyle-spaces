import { useNavigate } from 'react-router-dom'
import { useAuth } from '../stores/authStore'
import { Ellie } from '../components/ellie'
import { useShihTzuCompanion } from '../hooks'
import { ThemeToggle } from '../components/theme'
import { useEffect, useState } from 'react'
import './Landing.css'

export function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(false)

  // Use the companion hook for Ellie's behavior (must be called before any returns)
  const {
    mood,
    position,
    setMood,
    celebrate,
  } = useShihTzuCompanion({
    initialMood: 'excited',
    initialPosition: {
      x: Math.min(window.innerWidth * 0.75, window.innerWidth - 200),
      y: 200
    }
  })

  useEffect(() => {
    setIsVisible(true)
  }, [])

  // If user is already logged in, redirect to dashboard
  if (user) {
    navigate('/dashboard')
    return null
  }

  return (
    <div className="landing">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-header__content">
          <h1 className="landing-logo">Lifestyle Spaces</h1>
          <div className="landing-header__actions">
            <ThemeToggle showLabel={false} />
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="btn btn-secondary"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                celebrate()
                navigate('/signup')
              }}
              className="btn btn-primary"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={`landing-hero ${isVisible ? 'fade-in' : ''}`}>
        <div className="landing-hero__content">
          <div className="landing-hero__badge">
            <span className="badge-icon">✨</span>
            <span>Start Your Wellness Journey Today</span>
          </div>
          <h2 className="landing-hero__title">
            Your Wellness Journey, <span className="text-primary">Together</span>
          </h2>
          <p className="landing-hero__description">
            Create meaningful spaces for your lifestyle goals. Connect with others,
            share experiences, and achieve your wellness dreams as a community.
          </p>
          <div className="landing-hero__cta">
            <button
              type="button"
              onClick={() => {
                celebrate()
                navigate('/signup')
              }}
              className="btn btn-primary btn-large"
            >
              Start Your Journey
              <span className="btn-icon">→</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="btn btn-secondary btn-large"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features">
        <h3 className="landing-section-title">Why Lifestyle Spaces?</h3>
        <div className="landing-features__grid">
          <div className="feature-card">
            <div className="feature-card__icon">🏠</div>
            <h4 className="feature-card__title">Create Spaces</h4>
            <p className="feature-card__description">
              Build dedicated spaces for different aspects of your lifestyle journey
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-card__icon">👥</div>
            <h4 className="feature-card__title">Connect & Collaborate</h4>
            <p className="feature-card__description">
              Invite friends and family to share your wellness experiences
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-card__icon">📊</div>
            <h4 className="feature-card__title">Track Together</h4>
            <p className="feature-card__description">
              Monitor progress and celebrate achievements as a community
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-card__icon">🎯</div>
            <h4 className="feature-card__title">Set Goals</h4>
            <p className="feature-card__description">
              Define and achieve your lifestyle goals with group support
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="landing-how-it-works">
        <h3 className="landing-section-title">How It Works</h3>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-icon">📝</div>
            <h4 className="step-title">Create Your Space</h4>
            <p className="step-description">
              Set up a dedicated space for your wellness goals - fitness, nutrition, mindfulness, or any lifestyle aspect
            </p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-icon">👋</div>
            <h4 className="step-title">Invite Your Crew</h4>
            <p className="step-description">
              Share invite codes with friends, family, or like-minded individuals to join your wellness journey
            </p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-icon">🚀</div>
            <h4 className="step-title">Grow Together</h4>
            <p className="step-description">
              Track progress, share experiences, and celebrate wins as a supportive community
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta">
        <div className="landing-cta__content">
          <h3 className="landing-cta__title">Ready to Get Started?</h3>
          <p className="landing-cta__description">
            Start building healthier, happier habits with your community
          </p>
          <button
            type="button"
            onClick={() => {
              celebrate()
              navigate('/signup')
            }}
            className="btn btn-primary btn-large btn-pulse"
          >
            Create Your Free Account
            <span className="btn-icon">→</span>
          </button>
          <p className="landing-cta__note">
            No credit card required • Free forever • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; 2025 Lifestyle Spaces. Building wellness communities together.</p>
      </footer>

      {/* Ellie Companion */}
      <Ellie
        mood={mood}
        position={position}
        size="md"
        variant="default"
        showThoughtBubble={true}
        thoughtText="Welcome! Ready to start your wellness journey? 🎉"
        onClick={() => setMood(mood === 'happy' ? 'excited' : 'happy')}
        className="hidden lg:block"
      />
    </div>
  )
}
