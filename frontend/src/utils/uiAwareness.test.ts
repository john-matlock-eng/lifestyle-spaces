import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NoGoZone,
  PositionPriority,
  scanInteractiveElements,
  getNoGoZones,
  getBestPosition,
  isPositionSafe,
  createUIAwarenessObserver,
} from './uiAwareness';

describe('uiAwareness', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = '';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  describe('scanInteractiveElements', () => {
    it('should find buttons', () => {
      container.innerHTML = '<button id="test-btn">Click me</button>';

      const elements = scanInteractiveElements();

      expect(elements.length).toBeGreaterThan(0);
      const hasButton = elements.some((el) => el.tagName === 'BUTTON');
      expect(hasButton).toBe(true);
    });

    it('should find input elements', () => {
      container.innerHTML = '<input type="text" id="test-input" />';

      const elements = scanInteractiveElements();

      const hasInput = elements.some((el) => el.tagName === 'INPUT');
      expect(hasInput).toBe(true);
    });

    it('should find links', () => {
      container.innerHTML = '<a href="#" id="test-link">Link</a>';

      const elements = scanInteractiveElements();

      const hasLink = elements.some((el) => el.tagName === 'A');
      expect(hasLink).toBe(true);
    });

    it('should find navigation elements', () => {
      container.innerHTML = '<nav id="test-nav">Navigation</nav>';

      const elements = scanInteractiveElements();

      const hasNav = elements.some((el) => el.tagName === 'NAV');
      expect(hasNav).toBe(true);
    });

    it('should find elements with role="button"', () => {
      container.innerHTML = '<div role="button" id="test-role-btn">Button</div>';

      const elements = scanInteractiveElements();

      const hasRoleButton = elements.some((el) => el.getAttribute('role') === 'button');
      expect(hasRoleButton).toBe(true);
    });

    it('should exclude hidden elements', () => {
      container.innerHTML = `
        <button style="display: none;">Hidden</button>
        <button style="visibility: hidden;">Also Hidden</button>
        <button>Visible</button>
      `;

      const elements = scanInteractiveElements();

      expect(elements.length).toBe(1);
    });

    it('should exclude disabled elements', () => {
      container.innerHTML = `
        <button disabled>Disabled</button>
        <button>Enabled</button>
      `;

      const elements = scanInteractiveElements();

      expect(elements.length).toBe(1);
    });
  });

  describe('getNoGoZones', () => {
    it('should create no-go zones around interactive elements', () => {
      container.innerHTML = '<button id="test-btn">Click me</button>';

      const zones = getNoGoZones();

      expect(zones.length).toBeGreaterThan(0);
    });

    it('should have 200px radius by default', () => {
      container.innerHTML = '<button id="test-btn">Click me</button>';

      const zones = getNoGoZones();
      const zone = zones.find((z) => z.element.id === 'test-btn');

      expect(zone?.radius).toBe(200);
    });

    it('should allow custom radius', () => {
      container.innerHTML = '<button id="test-btn">Click me</button>';

      const zones = getNoGoZones(300);
      const zone = zones.find((z) => z.element.id === 'test-btn');

      expect(zone?.radius).toBe(300);
    });

    it('should calculate center position correctly', () => {
      const button = document.createElement('button');
      button.id = 'test-btn';
      button.style.position = 'absolute';
      button.style.left = '100px';
      button.style.top = '100px';
      button.style.width = '100px';
      button.style.height = '50px';
      container.appendChild(button);

      const zones = getNoGoZones();
      const zone = zones.find((z) => z.element.id === 'test-btn');

      expect(zone?.center).toBeDefined();
      expect(zone?.center.x).toBeGreaterThan(0);
      expect(zone?.center.y).toBeGreaterThan(0);
    });

    it('should include priority for different element types', () => {
      container.innerHTML = `
        <button id="btn">Button</button>
        <input id="input" type="text" />
        <a id="link" href="#">Link</a>
        <div id="generic">Generic</div>
      `;

      const zones = getNoGoZones();

      const btnZone = zones.find((z) => z.element.id === 'btn');
      const inputZone = zones.find((z) => z.element.id === 'input');

      expect(btnZone?.priority).toBeDefined();
      expect(inputZone?.priority).toBeDefined();
    });
  });

  describe('isPositionSafe', () => {
    it('should return true for position far from no-go zones', () => {
      const zones: NoGoZone[] = [
        {
          element: document.createElement('button'),
          center: { x: 100, y: 100 },
          radius: 50,
          priority: 'high' as PositionPriority,
        },
      ];

      const position = { x: 500, y: 500 };
      const isSafe = isPositionSafe(position, zones);

      expect(isSafe).toBe(true);
    });

    it('should return false for position inside no-go zone', () => {
      const zones: NoGoZone[] = [
        {
          element: document.createElement('button'),
          center: { x: 100, y: 100 },
          radius: 200,
          priority: 'high' as PositionPriority,
        },
      ];

      const position = { x: 150, y: 150 };
      const isSafe = isPositionSafe(position, zones);

      expect(isSafe).toBe(false);
    });

    it('should handle multiple no-go zones', () => {
      const zones: NoGoZone[] = [
        {
          element: document.createElement('button'),
          center: { x: 100, y: 100 },
          radius: 50,
          priority: 'high' as PositionPriority,
        },
        {
          element: document.createElement('input'),
          center: { x: 200, y: 200 },
          radius: 50,
          priority: 'high' as PositionPriority,
        },
      ];

      const position = { x: 300, y: 300 };
      const isSafe = isPositionSafe(position, zones);

      expect(isSafe).toBe(true);
    });
  });

  describe('getBestPosition', () => {
    beforeEach(() => {
      // Set up viewport dimensions
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 768 });
    });

    it('should return a safe position avoiding collisions', () => {
      container.innerHTML = '<button style="position: absolute; left: 100px; top: 100px;">Button</button>';

      const position = getBestPosition();

      expect(position).toBeDefined();
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeGreaterThanOrEqual(0);
    });

    it('should prefer right side of screen', () => {
      // Empty screen, should default to right side
      const position = getBestPosition();

      expect(position.x).toBeGreaterThan(512); // Right half
    });

    it('should avoid no-go zones', () => {
      const zones: NoGoZone[] = [
        {
          element: document.createElement('button'),
          center: { x: 900, y: 650 },
          radius: 200,
          priority: 'high' as PositionPriority,
        },
      ];

      const position = getBestPosition({ noGoZones: zones });

      const distance = Math.sqrt(
        Math.pow(position.x - 900, 2) + Math.pow(position.y - 650, 2)
      );

      expect(distance).toBeGreaterThan(200);
    });

    it('should respect custom viewport bounds', () => {
      const position = getBestPosition({
        viewportWidth: 800,
        viewportHeight: 600,
      });

      expect(position.x).toBeLessThanOrEqual(800);
      expect(position.y).toBeLessThanOrEqual(600);
    });

    it('should respect minimum distance from edges', () => {
      const position = getBestPosition({ minEdgeDistance: 50 });

      expect(position.x).toBeGreaterThanOrEqual(50);
      expect(position.y).toBeGreaterThanOrEqual(50);
      expect(position.x).toBeLessThanOrEqual(1024 - 50);
      expect(position.y).toBeLessThanOrEqual(768 - 50);
    });

    it('should handle preferred position if safe', () => {
      const preferredPosition = { x: 500, y: 400 };
      const position = getBestPosition({ preferredPosition });

      // Should be close to preferred if no obstacles
      expect(Math.abs(position.x - preferredPosition.x)).toBeLessThan(100);
      expect(Math.abs(position.y - preferredPosition.y)).toBeLessThan(100);
    });

    it('should adjust preferred position if unsafe', () => {
      const preferredPosition = { x: 500, y: 400 };
      const zones: NoGoZone[] = [
        {
          element: document.createElement('button'),
          center: { x: 500, y: 400 },
          radius: 200,
          priority: 'high' as PositionPriority,
        },
      ];

      const position = getBestPosition({ preferredPosition, noGoZones: zones });

      const distance = Math.sqrt(
        Math.pow(position.x - 500, 2) + Math.pow(position.y - 400, 2)
      );

      expect(distance).toBeGreaterThan(200);
    });
  });

  describe('createUIAwarenessObserver', () => {
    it('should create a MutationObserver', () => {
      const callback = vi.fn();
      const observer = createUIAwarenessObserver(callback);

      expect(observer).toBeDefined();
      expect(observer.disconnect).toBeDefined();
    });

    it('should call callback when DOM changes', () => {
      const callback = vi.fn();
      const observer = createUIAwarenessObserver(callback);

      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      // Add a button
      const button = document.createElement('button');
      container.appendChild(button);

      // Wait for mutation observer
      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
        observer.disconnect();
      }, 100);
    });

    it('should throttle callbacks', () => {
      const callback = vi.fn();
      const observer = createUIAwarenessObserver(callback, 100);

      observer.observe(container, {
        childList: true,
        subtree: true,
      });

      // Make multiple rapid changes
      for (let i = 0; i < 5; i++) {
        const button = document.createElement('button');
        container.appendChild(button);
      }

      // Callback should be throttled (called less than 5 times)
      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
        expect(callback.mock.calls.length).toBeLessThan(5);
        observer.disconnect();
      }, 200);
    });

    it('should be able to disconnect', () => {
      const callback = vi.fn();
      const observer = createUIAwarenessObserver(callback);

      observer.observe(container, {
        childList: true,
        subtree: true,
      });

      observer.disconnect();

      // Add element after disconnect
      const button = document.createElement('button');
      container.appendChild(button);

      setTimeout(() => {
        expect(callback).not.toHaveBeenCalled();
      }, 100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document', () => {
      document.body.innerHTML = '';

      const elements = scanInteractiveElements();
      const zones = getNoGoZones();

      expect(elements).toBeDefined();
      expect(zones).toBeDefined();
      expect(Array.isArray(elements)).toBe(true);
      expect(Array.isArray(zones)).toBe(true);
    });

    it('should handle elements with zero dimensions', () => {
      const button = document.createElement('button');
      button.style.width = '0';
      button.style.height = '0';
      container.appendChild(button);

      const zones = getNoGoZones();

      expect(zones).toBeDefined();
    });

    it('should handle very small viewport', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 100 });
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 100 });

      const position = getBestPosition();

      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.x).toBeLessThanOrEqual(100);
      expect(position.y).toBeLessThanOrEqual(100);
    });

    it('should handle viewport filled with no-go zones', () => {
      // Create many zones covering most of the viewport
      const zones: NoGoZone[] = [];
      for (let x = 0; x < 1000; x += 200) {
        for (let y = 0; y < 700; y += 200) {
          zones.push({
            element: document.createElement('div'),
            center: { x, y },
            radius: 100,
            priority: 'medium' as PositionPriority,
          });
        }
      }

      const position = getBestPosition({ noGoZones: zones });

      // Should still find a position
      expect(position).toBeDefined();
    });
  });
});
