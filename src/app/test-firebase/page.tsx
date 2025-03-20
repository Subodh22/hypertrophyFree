'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { useAuth } from '@/lib/hooks/useAuth';

export default function TestFirebasePage() {
  const { user } = useAuth();
  const [testResult, setTestResult] = useState<string>('Not tested yet');
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState<any>(null);
  
  // Test if Firebase is working correctly
  const testFirebase = async () => {
    try {
      setLoading(true);
      setTestResult('Testing...');
      
      // Check if we're in a browser
      if (typeof window === 'undefined') {
        setTestResult('ERROR: Not in browser context');
        return;
      }
      
      // Check if user exists
      if (!user) {
        setTestResult('ERROR: No user logged in');
        return;
      }
      
      console.log("Starting Firebase test with user:", user.uid);
      
      // Create test document ID with timestamp to ensure uniqueness
      const testDocId = `test-${Date.now()}`;
      
      // Test data to write
      const testData = {
        userId: user.uid,
        timestamp: new Date().toISOString(),
        testValue: "Test value " + Math.floor(Math.random() * 1000),
        isTest: true
      };
      
      console.log("Creating test document in Firebase...");
      
      // Create a test document in the mesocycles collection
      const docRef = doc(db, 'mesocycles', testDocId);
      await setDoc(docRef, testData);
      
      console.log("Test document created:", testDocId);
      
      // Read it back to verify
      console.log("Reading test document back...");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Test document data:", data);
        setTestData(data);
        setTestResult(`SUCCESS: Test document created and read with ID: ${testDocId}`);
      } else {
        setTestResult('ERROR: Document was created but cannot be read back');
      }
    } catch (error: any) {
      console.error("Firebase test error:", error);
      setTestResult(`ERROR: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Firebase Test Page</h1>
      
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-4">Firebase Connection Test</h2>
        
        <div className="mb-4">
          <p>User ID: {user ? user.uid : 'Not logged in'}</p>
          <p>Status: 
            <span className={`ml-2 ${
              testResult.includes('SUCCESS') ? 'text-green-500' : 
              testResult.includes('ERROR') ? 'text-red-500' : 'text-yellow-500'
            }`}>
              {testResult}
            </span>
          </p>
        </div>
        
        <button 
          onClick={testFirebase} 
          disabled={loading}
          className="bg-neon-green text-black font-bold py-2 px-4 rounded hover:bg-neon-green/80 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Firebase Connection'}
        </button>
      </div>
      
      {testData && (
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Test Data</h2>
          <pre className="bg-black/30 p-4 rounded overflow-auto">
            {JSON.stringify(testData, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Firebase Config Check</h2>
        <p className="mb-2">These environment variables should be defined:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>NEXT_PUBLIC_FIREBASE_API_KEY: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Defined' : '❌ Missing'}</li>
          <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Defined' : '❌ Missing'}</li>
          <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Defined' : '❌ Missing'}</li>
          <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: {process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✅ Defined' : '❌ Missing'}</li>
          <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: {process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✅ Defined' : '❌ Missing'}</li>
          <li>NEXT_PUBLIC_FIREBASE_APP_ID: {process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✅ Defined' : '❌ Missing'}</li>
        </ul>
      </div>
    </div>
  );
} 