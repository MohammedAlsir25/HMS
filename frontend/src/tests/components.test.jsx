import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import React from 'react';

describe('Button component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('bg-lilac-bloom');
  });

  it('renders secondary variant', () => {
    render(<Button variant="secondary">Cancel</Button>);
    const btn = screen.getByRole('button', { name: /cancel/i });
    expect(btn.className).toContain('bg-obsidian');
  });

  it('renders disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole('button', { name: /disabled/i });
    expect(btn).toBeDisabled();
  });
});

describe('Card component', () => {
  it('renders with content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>Content here</CardContent>
      </Card>,
    );
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });
});

describe('Badge component', () => {
  it('renders with text', () => {
    render(<Badge variant="success">Active</Badge>);
    const badge = screen.getByText('Active');
    expect(badge.className).toContain('bg-green-100');
  });
});

describe('Avatar component', () => {
  it('renders initials when no src', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders image when src provided', () => {
    render(<Avatar src="/test.jpg" name="John" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/test.jpg');
  });
});
