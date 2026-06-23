import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import PharmacyPOS from '../features/pos/PharmacyPOS';
import OpticsPOS from '../features/pos/OpticsPOS';

function WithRouter({ children }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('PharmacyPOS', () => {
  it('renders title and description', () => {
    render(<WithRouter><PharmacyPOS /></WithRouter>);
    expect(screen.getByText('Pharmacy POS')).toBeInTheDocument();
    expect(screen.getByText('Dispense medications and process payments')).toBeInTheDocument();
  });

  it('renders cart section', () => {
    render(<WithRouter><PharmacyPOS /></WithRouter>);
    const carts = screen.getAllByText(/Cart/);
    expect(carts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Cart is empty')).toBeInTheDocument();
  });

  it('renders inventory search', () => {
    render(<WithRouter><PharmacyPOS /></WithRouter>);
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });
});

describe('OpticsPOS', () => {
  it('renders title and description', () => {
    render(<WithRouter><OpticsPOS /></WithRouter>);
    expect(screen.getByText('Optics POS')).toBeInTheDocument();
    expect(screen.getByText('Dispense frames, lenses & process payments')).toBeInTheDocument();
  });

  it('renders cart and prescription sections', () => {
    render(<WithRouter><OpticsPOS /></WithRouter>);
    const carts = screen.getAllByText(/Cart/);
    expect(carts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Cart is empty')).toBeInTheDocument();
    expect(screen.getByText('Optical Products')).toBeInTheDocument();
  });
});
