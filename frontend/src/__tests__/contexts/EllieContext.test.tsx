import { renderHook, act } from '@testing-library/react';
import { EllieProvider, useEllie } from '../../contexts/EllieContext';

describe('EllieContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <EllieProvider>{children}</EllieProvider>
  );

  beforeEach(() => {
    localStorage.clear();
  });

  it('should provide default state', () => {
    const { result } = renderHook(() => useEllie(), { wrapper });
    expect(result.current.mood).toBe('idle');
    expect(result.current.perchIndex).toBe(1);
    expect(result.current.isTyping).toBe(false);
  });

  it('should update mood', () => {
    const { result } = renderHook(() => useEllie(), { wrapper });
    act(() => result.current.setMood('happy'));
    expect(result.current.mood).toBe('happy');
  });

  it('should update perch and persist', () => {
    const { result } = renderHook(() => useEllie(), { wrapper });
    act(() => result.current.setPerch(2));
    expect(result.current.perchIndex).toBe(2);
    expect(localStorage.getItem('ellie-perch')).toBe('2');
  });

  it('should update typing state', () => {
    const { result } = renderHook(() => useEllie(), { wrapper });
    act(() => result.current.setIsTyping(true));
    expect(result.current.isTyping).toBe(true);
  });

  it('should cycle perches', () => {
    const { result } = renderHook(() => useEllie(), { wrapper });
    expect(result.current.perchIndex).toBe(1);
    act(() => result.current.cyclePerch());
    expect(result.current.perchIndex).toBe(2);
    act(() => result.current.cyclePerch());
    expect(result.current.perchIndex).toBe(3);
    act(() => result.current.cyclePerch());
    expect(result.current.perchIndex).toBe(0);
    act(() => result.current.cyclePerch());
    expect(result.current.perchIndex).toBe(1);
  });

  it('should load perch from localStorage', () => {
    localStorage.setItem('ellie-perch', '3');
    const { result } = renderHook(() => useEllie(), { wrapper });
    expect(result.current.perchIndex).toBe(3);
  });

  it('should throw error outside provider', () => {
    expect(() => renderHook(() => useEllie())).toThrow('useEllie must be used within EllieProvider');
  });
});
