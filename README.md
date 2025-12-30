# Financial Planning Suite

A comprehensive set of privacy-focused financial planning tools that run entirely in your browser. No data is sent to any server - everything stays on your device.

## Tools

### 🎯 Monte Carlo Retirement Simulator
Probabilistic retirement projections using Monte Carlo simulation with thousands of market scenarios.

**Features:**
- Run 10,000+ simulations to model retirement success probability
- Support for multiple account types (401k, IRA, Roth, taxable)
- Social Security benefit calculator with early/late claiming adjustments
- Life events modeling (one-time expenses, windfalls, part-time income)
- Tax-efficient withdrawal strategy (taxable → traditional → Roth)
- Visualize outcome distributions and portfolio paths over time

### 💰 Income Allocation Calculator
Budget planning based on the "I Will Teach You to Be Rich" methodology by Ramit Sethi.

**Features:**
- Four-category budget framework: Fixed Costs, Short-term Savings, Long-term Investments, Guilt-free Spending
- Pre-tax and post-tax income modes with tax estimation
- Pre-configured budget presets (Conservative, Balanced, Aggressive)
- Real-time allocation calculations with visual feedback
- Session persistence across browser sessions

### 📊 Transaction Analyzer
Analyze your spending patterns by importing bank/credit card CSV files.

**Features:**
- Smart CSV parser with auto-detection of date/description/amount columns
- Pattern-based auto-categorization (groceries, restaurants, utilities, etc.)
- AI-powered categorization for uncategorized transactions (Gemini/OpenAI/Anthropic)
- Automatic transfer detection to avoid double-counting
- Bulk categorization with learned rules
- Export spending data to Retirement Simulator

## Getting Started

### Online (Recommended)
Visit the [live demo](https://your-github-username.github.io/financial-planning/) hosted on GitHub Pages.

### Local Development
No build process required - just open the HTML files:

```bash
# Clone the repository
git clone https://github.com/your-username/financial-planning.git
cd financial-planning

# Option 1: Open directly in browser
open index.html  # or double-click the file

# Option 2: Use a local server (recommended)
python -m http.server 8000
# or
npx serve .
```

Then navigate to `http://localhost:8000`

## Privacy & Data Storage

**Your data never leaves your device.** All calculations and storage happen in your browser using localStorage.

### Session Management
- **Save Session**: Export all your data as a JSON file for backup
- **Load Session**: Import a previously saved session
- **Clear Data**: Remove all stored data from browser

The session file contains all your inputs across all three tools and can be used to:
- Back up your financial planning data
- Transfer data between devices
- Share anonymized scenarios with advisors

## How to Use

### 1. Start with Transaction Analyzer (Optional)
Upload your bank/credit card CSV files to understand your current spending patterns. The tool will:
- Auto-categorize transactions using pattern matching
- Detect and exclude inter-account transfers
- Calculate monthly averages for each category
- Automatically populate spending data in the Retirement Simulator

### 2. Use Income Allocation Calculator
Define your ideal budget allocation:
- Enter your income (pre-tax or post-tax)
- Adjust sliders for each category or use presets
- See real-time dollar allocations
- Save your plan for future reference

### 3. Run Retirement Simulator
Model your retirement with Monte Carlo simulation:
- Enter current age, retirement age, and life expectancy
- Input savings, contributions, and expected returns
- Add life events (home purchase, kids' college, inheritance)
- Configure Social Security benefits
- Run 10,000 simulations to see success probability
- View percentile bands showing likely outcome ranges

## Technical Details

### Technology Stack
- Pure HTML/CSS/JavaScript (no build step)
- Chart.js for visualizations
- localStorage for data persistence
- Client-side only - no backend required

### Browser Support
Modern browsers with ES6+ support:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### File Structure
```
financial-planning/
├── index.html                   # Landing page / splash screen
├── retirement-simulator.html    # Monte Carlo Retirement Simulator
├── income-allocation.html       # Income Allocation Calculator
├── transaction-analyzer.html    # Transaction Analyzer
├── shared.js                    # Shared utilities
├── CLAUDE.md                    # Developer documentation
└── .github/workflows/pages.yml  # GitHub Pages deployment
```

## Accessibility

All tools are designed with Section 508 compliance:
- Keyboard navigation support
- Screen reader compatible
- High contrast focus indicators
- ARIA labels and semantic HTML

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Test across browsers
4. Submit a pull request

## Disclaimer

**This tool is for educational purposes only and does not constitute financial advice.**

- Past performance does not guarantee future results
- Actual investment returns vary significantly
- Monte Carlo simulations show probabilities, not certainties
- Consult a qualified financial advisor for personalized planning

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Income allocation methodology inspired by Ramit Sethi's "I Will Teach You to Be Rich"
- Social Security calculations based on SSA.gov 2024 benefit formulas
- Monte Carlo simulation using Box-Muller transform for normal distribution
