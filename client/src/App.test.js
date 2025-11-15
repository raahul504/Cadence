import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock console.error to suppress expected error messages in the test output
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Restore the original console.error function
  if (console.error.mockRestore) {
    console.error.mockRestore();
  }
});

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const todayYYYYMMDD = `${year}-${month}-${day}`;

const mockEvents = [
  { id: 1, title: 'Test Event 1', date: todayYYYYMMDD, time: '10:00', description: 'desc 1', color: 'blue' },
];

test('deleteEvent should fail when the server returns an error', async () => {
  // Mock the initial GET request to load events
  global.fetch = jest.fn((url) => {
    if (url.endsWith('/events')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockEvents),
      });
    }
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
    });
  });

  render(<App />);

  // Expand the sidebar to make the event list visible
  const expandButton = screen.getByRole('button', { name: /▶/ });
  fireEvent.click(expandButton);

  // Wait for the event to be displayed
  await waitFor(() => screen.getByText('Test Event 1'));

  // Find and click the delete button for the event
  const deleteButton = screen.getByRole('button', { name: /🗑️/i });
  fireEvent.click(deleteButton);

  // Wait for the confirmation modal to appear
  await waitFor(() => screen.getByText('⚠️ Delete Event'));

  // Mock the DELETE request to fail
  global.fetch.mockImplementation((url, options) => {
    if (options && options.method === 'DELETE') {
      return Promise.reject(new Error('Server error')); // Simulate a network error
    }
    // Fallback for any other fetches
    return Promise.resolve({ json: () => Promise.resolve({}) });
  });

  // Click the confirm delete button in the modal
  const confirmDeleteButton = screen.getByRole('button', { name: 'Delete Event' });
  fireEvent.click(confirmDeleteButton);

  // Wait for the error to be logged
  await waitFor(() => {
    expect(console.error).toHaveBeenCalledWith('Error deleting event:', new Error('Server error'));
  });
});
