import { useNavigate } from 'react-router-dom'
import { useAuth } from '../stores/authStore'
import { Ellie } from '../components/ellie'
import { useShihTzuCompanion } from '../hooks'
import { ThemeToggle } from '../components/theme'
import './Landing.css'

export function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Use the companion hook for Ellie's behavior (must be called before any returns)
  const {
    mood,
    position,
    setMood,
    celebrate,
  } = useShihTzuCompanion({
    initialMood: 'excited',
    initialPosition: { x: window.innerWidth - 150, y: 200 }
  })

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
      <section className="landing-hero">
        <div className="landing-hero__content">
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

      {/* CTA Section */}
      <section className="landing-cta">
        <h3 className="landing-cta__title">Ready to Get Started?</h3>
        <p className="landing-cta__description">
          Join thousands of others building healthier, happier lives together
        </p>
        <button
          type="button"
          onClick={() => {
            celebrate()
            navigate('/signup')
          }}
          className="btn btn-primary btn-large"
        >
          Create Your Free Account
        </button>
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
