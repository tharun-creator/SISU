import React from 'react';
import AppLayout from '../components/layout/AppLayout';
import BookingForm from '../features/booking/BookingForm';

export const BookingPage: React.FC = () => {
  return (
    <AppLayout title="Mentorship Booking">
      <div className="space-y-6">
        <BookingForm />
      </div>
    </AppLayout>
  );
};
export default BookingPage;
