module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [['module:react-native-dotenv']],
};
```

---

**13. `.env`** — add:
```
API_BASE_URL=http://10.0.2.2:8080/api
GOOGLE_MAPS_KEY=your_key_here;