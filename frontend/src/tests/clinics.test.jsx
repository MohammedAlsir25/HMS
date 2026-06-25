import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const testQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
import MedicineDashboard from '../features/clinics/MedicineDashboard';
import ENTDashboard from '../features/clinics/ENTDashboard';
import DentalDashboard from '../features/clinics/DentalDashboard';
import RetinaDashboard from '../features/clinics/RetinaDashboard';
import GlaucomaDashboard from '../features/clinics/GlaucomaDashboard';
import OrbitDashboard from '../features/clinics/OrbitDashboard';
import PedsOphthDashboard from '../features/clinics/PedsOphthDashboard';
import GenOphthDashboard from '../features/clinics/GenOphthDashboard';

function WithRouter({ children }) {
  return <QueryClientProvider client={testQueryClient}><BrowserRouter>{children}</BrowserRouter></QueryClientProvider>;
}

describe('MedicineDashboard', () => {
  it('renders title and core elements', () => {
    render(<WithRouter><MedicineDashboard /></WithRouter>);
    expect(screen.getByText('Medicine Clinic')).toBeInTheDocument();
    expect(screen.getByText('Patient Selection')).toBeInTheDocument();
    expect(screen.getByText('Search Patient')).toBeInTheDocument();
  });

  it('renders waiting queue section', () => {
    render(<WithRouter><MedicineDashboard /></WithRouter>);
    expect(screen.getByText('Waiting Queue')).toBeInTheDocument();
  });
});

describe('ENTDashboard', () => {
  it('renders title and core elements', () => {
    render(<WithRouter><ENTDashboard /></WithRouter>);
    expect(screen.getByText('ENT Clinic')).toBeInTheDocument();
    expect(screen.getByText('Patient Selection')).toBeInTheDocument();
  });

  it('renders waiting queue section', () => {
    render(<WithRouter><ENTDashboard /></WithRouter>);
    expect(screen.getByText('Waiting Queue')).toBeInTheDocument();
  });
});

describe('DentalDashboard', () => {
  it('renders title and core elements', () => {
    render(<WithRouter><DentalDashboard /></WithRouter>);
    expect(screen.getByText('Dental Clinic')).toBeInTheDocument();
    expect(screen.getByText('Patient Selection')).toBeInTheDocument();
  });

  it('renders header and patient selection', () => {
    render(<WithRouter><DentalDashboard /></WithRouter>);
    expect(screen.getByText('Dental Clinic')).toBeInTheDocument();
    expect(screen.getByText('Oral Examination & Dental Treatment')).toBeInTheDocument();
    expect(screen.getByText('Patient Selection')).toBeInTheDocument();
    expect(screen.getByText('Search Patient')).toBeInTheDocument();
  });

  it('renders waiting queue section', () => {
    render(<WithRouter><DentalDashboard /></WithRouter>);
    expect(screen.getByText('Waiting Queue')).toBeInTheDocument();
  });
});

describe('RetinaDashboard', () => {
  it('renders title and core elements', () => {
    render(<WithRouter><RetinaDashboard /></WithRouter>);
    expect(screen.getByText('Retina Clinic')).toBeInTheDocument();
    expect(screen.getByText('Patient Selection')).toBeInTheDocument();
    expect(screen.getByText('Search Patient')).toBeInTheDocument();
  });

  it('renders waiting queue section', () => {
    render(<WithRouter><RetinaDashboard /></WithRouter>);
    expect(screen.getByText('Waiting Queue')).toBeInTheDocument();
  });

  it('renders header and subtitle', () => {
    render(<WithRouter><RetinaDashboard /></WithRouter>);
    expect(screen.getByText('Retina Clinic')).toBeInTheDocument();
    expect(screen.getByText('Fundus & Retinal Examination with AI-Assisted Diagnosis')).toBeInTheDocument();
    expect(screen.getByText('Patient Selection')).toBeInTheDocument();
    expect(screen.getByText('Waiting Queue')).toBeInTheDocument();
  });
});

describe('GlaucomaDashboard', () => {
  it('renders title and core elements', () => {
    render(<WithRouter><GlaucomaDashboard /></WithRouter>);
    expect(screen.getByText('Glaucoma Clinic')).toBeInTheDocument();
    expect(screen.getByText('Glaucoma Evaluation & Management with AI-Assisted Diagnosis')).toBeInTheDocument();
    expect(screen.getByText('Patient Selection')).toBeInTheDocument();
    expect(screen.getByText('Search Patient')).toBeInTheDocument();
    expect(screen.getByText('Waiting Queue')).toBeInTheDocument();
  });
});

describe('OrbitDashboard', () => {
  it('renders title and description', () => {
    render(<WithRouter><OrbitDashboard /></WithRouter>);
    expect(screen.getByText('Orbit Clinic')).toBeInTheDocument();
    expect(screen.getByText('Orbital & Oculoplastics Assessment with AI-Assisted Diagnosis')).toBeInTheDocument();
  });
});

describe('PedsOphthDashboard', () => {
  it('renders title and description', () => {
    render(<WithRouter><PedsOphthDashboard /></WithRouter>);
    expect(screen.getByText('Pediatrics Ophthalmology')).toBeInTheDocument();
    expect(screen.getByText('Child Development & Strabismus Assessment with AI-Assisted Diagnosis')).toBeInTheDocument();
  });
});

describe('GenOphthDashboard', () => {
  it('renders title and description', () => {
    render(<WithRouter><GenOphthDashboard /></WithRouter>);
    expect(screen.getByText('General Ophthalmology')).toBeInTheDocument();
    expect(screen.getByText('Refraction & Comprehensive Eye Exam with AI-Assisted Diagnosis')).toBeInTheDocument();
  });
});
