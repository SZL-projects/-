import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { searchAPI } from '../services/api';

export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setResults({});
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const doSearch = async () => {
      setIsLoading(true);
      try {
        const response = await searchAPI.search(debouncedQuery);
        if (!cancelled) {
          setResults(response.data.results || {});
          setTotalCount(response.data.totalCount || 0);
          setIsOpen(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Search error:', error);
          setResults({});
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    doSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // הצגת loading מיד כשהמשתמש מקליד (לפני ה-debounce)
  useEffect(() => {
    if (query.trim().length >= 2) {
      setIsLoading(true);
    }
  }, [query]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults({});
    setTotalCount(0);
    setIsOpen(false);
  }, []);

  return {
    query,
    setQuery,
    results,
    totalCount,
    isLoading,
    isOpen,
    setIsOpen,
    clearSearch,
  };
}
