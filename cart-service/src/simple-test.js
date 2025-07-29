// 간단한 테스트로 문제 진단
const request = require('supertest');
const express = require('express');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/test', (req, res) => {
  res.json({ message: 'test works' });
});

// 간단한 테스트 실행
(async () => {
  try {
    console.log('Testing basic routes...');
    
    const healthResponse = await request(app).get('/health');
    console.log('Health check:', healthResponse.status, healthResponse.body);
    
    const testResponse = await request(app).get('/test');
    console.log('Test route:', testResponse.status, testResponse.body);
    
    console.log('Basic tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
})();