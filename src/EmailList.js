import React, { useState } from 'react';
import axios from 'axios';

function EmailList() {
  const [query, setQuery] = useState('');
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:3000/search', { query });
      setEmails(response.data);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Email Search</h1>
      <input
        type="text"
        placeholder="Search emails"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>
      <ul>
        {emails.map((email, index) => (
          <li key={index}>
            <strong>{email._source.subject}</strong> - {email._source.category}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default EmailList;
