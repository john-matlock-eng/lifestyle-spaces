import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TableSectionDisplay } from './TableSectionDisplay';

describe('TableSectionDisplay', () => {
  const tableData = [
    { id: '1', name: 'John', age: 30, city: 'New York' },
    { id: '2', name: 'Jane', age: 25, city: 'Los Angeles' },
    { id: '3', name: 'Bob', age: 35, city: 'Chicago' },
  ];

  it('should render table with data from array value', () => {
    render(<TableSectionDisplay value={tableData} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('City')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should render table with data from JSON string value', () => {
    const jsonValue = JSON.stringify(tableData);

    render(<TableSectionDisplay value={jsonValue} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('should handle empty table data', () => {
    render(<TableSectionDisplay value={[]} />);

    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('should handle invalid JSON string', () => {
    render(<TableSectionDisplay value="invalid json" />);

    expect(screen.getByText('Invalid table data')).toBeInTheDocument();
  });

  it('should exclude id column from display', () => {
    render(<TableSectionDisplay value={tableData} />);

    // ID column should not be visible
    expect(screen.queryByText('Id')).not.toBeInTheDocument();
    // But data should still be rendered
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('should format column headers correctly', () => {
    const data = [
      { id: '1', first_name: 'John', last_name: 'Doe' },
    ];

    render(<TableSectionDisplay value={data} />);

    // Should convert snake_case to Title Case
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<TableSectionDisplay value={tableData} className="custom-table-class" />);

    expect(document.querySelector('.custom-table-class')).toBeInTheDocument();
  });

  it('should handle table with only id column', () => {
    const data = [{ id: '1' }, { id: '2' }];

    render(<TableSectionDisplay value={data} />);

    expect(screen.getByText('No columns found')).toBeInTheDocument();
  });

  it('should render numeric and string values correctly', () => {
    const mixedData = [
      { id: '1', name: 'Product A', price: 29.99, stock: 100 },
      { id: '2', name: 'Product B', price: 49.99, stock: 50 },
    ];

    render(<TableSectionDisplay value={mixedData} />);

    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('29.99')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
