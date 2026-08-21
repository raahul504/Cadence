// Quick Actions Component
// client/src/QuickActions.js

import React from 'react';

function QuickActions({ onActionClick }) {
  const quickActions = [
    {
      id: 'add',
      label: 'Add',
      icon: '➕',
      template: 'Create a new event for [title] on [date] at [time]'
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: '🗑️',
      template: 'Delete the event [event name]'
    },
    {
      id: 'view',
      label: 'View',
      icon: '📅',
      template: 'Show me my schedule for [today/this week/next week]'
    },
    {
      id: 'reschedule',
      label: 'Reschedule',
      icon: '🔄',
      template: 'Reschedule [event name] to [new date] at [new time]'
    }
  ];

  const handleActionClick = (template) => {
    if (onActionClick) {
      onActionClick(template);
    }
  };

  return (
    <div className="quick-actions">
      {quickActions.map((action) => (
        <button
          key={action.id}
          className="quick-action-btn"
          onClick={() => handleActionClick(action.template)}
          title={action.template}
        >
          <span className="quick-action-icon">{action.icon}</span>
          <span className="quick-action-label">{action.label}</span>
        </button>
      ))}
    </div>
  );
}

export default QuickActions;
