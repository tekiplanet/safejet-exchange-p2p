export default () => ({
  exchange: {
    coingeckoApiUrl: 'https://api.coingecko.com/api/v3',
    supportedCurrencies: ['usd', 'ngn', 'ghs', 'kes'], // Add more as needed
    updateInterval: 5 * 60 * 1000, // 5 minutes
  },
}); 