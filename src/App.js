import React, { Component } from 'react';
import './App.css';
const axios = require('axios');

// Check for prereqs, preclusion, mcs, basic requirements

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {value: '',
                  sem: '1',
                  year: '2018-2019',
                  modules: [],
                  info: {},
                  yourmods: {},
                  mcs: 0,
                  autocomplete: [],
                  error: ""
                };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(event) {
    if(event.target.type === "submit") {
      const preclusions = this.state.info.Preclusion.match(/[A-Z]{2,}[0-9]{4}[A-Z]*/g);
      const temp = this.state.yourmods;
      const mod = this.state.info.ModuleCode;
      const year = this.state.year;
      const sem = "Sem " + this.state.sem;
      var currmods = [];
      for(var year in this.state.yourmods) {
        currmods = currmods.concat(this.state.yourmods[year]["Sem 1"] + this.state.yourmods[year]["Sem 2"]);
      }
      // Checks for terminating conditions
      if(currmods.filter(currmod => currmod === mod).length > 0) {
        this.setState({error: "No Duplicates"});
        return undefined;
      } else if(currmods.filter(currmod => preclusions.indexOf(currmod) >= 0).length > 0) {
        this.setState({error: "Already precluded"});
        return undefined;
      }
      
      if(temp[year] === undefined) {
        temp[year] = {"Sem 1": [], "Sem 2": []};
      }
      temp[year][sem] = temp[year][sem].concat([mod]);
      
      this.setState((state, props) => ({
        yourmods: temp,
        mcs: state.mcs + parseInt(state.info.ModuleCredit),
        error: ""
      })); 
    } else if(event.target.tagName === "OPTION") {
      const parent = event.target.parentNode.id
      if(parent === "select-sem") {
        this.setState({sem: event.target.value});
      } else if(parent === "select-year") {
        this.setState({year: event.target.value});
      }
    }
  }

  handleChange(event) {
    const value = event.target.value;
    const modcodes = this.state.modules.map(mod => mod["ModuleCode"]);
    const results = (value === "") ? [] : modcodes.filter(mod => RegExp(value + '+').test(mod)).slice(0,10);
    this.setState({value: value,
                  autocomplete: results
                  });
  }

  handleSubmit(event) {
    const url = `https://api.nusmods.com/${this.state.year}/${this.state.sem}/modules/${this.state.value}.json`;
    axios.get(url)
    .then((response) => {
      this.setState({
        info: response.data
      });
      console.log(url);
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    })
    event.preventDefault();
  }

  componentDidMount() {
    axios.get("https://api.nusmods.com/2018-2019/moduleList.json")
    .then((response) => {
      this.setState({
        modules: response.data
      })
    })
  }
  
  convert(obj) {
    const blacklist = ["Timetable", "LecturePeriods", "TutorialPeriods", "CorsBiddingStats", "Workload"];
    if(typeof obj !== "object") {
      return obj;
    } else if(obj.constructor === Array) {
      return obj.map(elem => <tr><td>{this.convert(elem)}</td></tr>);
    } else {
      const props = Object.keys(obj).filter(key => blacklist.indexOf(key) === -1);
      return props.map(key => <tr><td>{key}</td> <td>{this.convert(obj[key])}</td> </tr>);
    }
  }

  range(n) {
    const temp = [];
    for(var i = 0; i < n; i++) {
      temp[i] = i;
    }
    return temp;
  }

  render() {
    // Converts from object literal to html syntax
    
    return (
      <div className="App">
        <div>
          Your Mods: 
          {this.convert(this.state.yourmods)} <br/>
          Your MCs: {this.state.mcs}<br/>
        </div>
        <div>
          <form onSubmit={this.handleSubmit} onChange={this.handleChange}>
            Module Code:
            <input type="text" name="name" />
            <input type="submit" value="Search" />
            <button id="add-mod" onClick={this.handleClick}>Add Module</button> <br/>
            <span style={{color: "red"}}>{this.state.error}</span><br/>
            Semester: 
            <select id="select-sem" onClick={this.handleClick}>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
            Year:
            <select id="select-year" onClick={this.handleClick}>
              {this.range(19).map(i => (<option value={(i + 2000) +  "-" + (i + 2001)}>{(i + 2000) +  "-" + (i + 2001)}</option>))}
            </select>
            {this.state.autocomplete.map(result => <p>{result}</p>)}
          </form>
          {this.convert(this.state.info)}
        </div>
      </div>
    );
  }
}

export default App;
