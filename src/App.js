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
                  info: undefined,
                  yourmods: {},
                  mcs: 0,
                  autocomplete: [],
                  error: ""
                };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  filterObjProps(blacklist, obj) {    
    // Gets rid of unwanted object properties
    if(typeof obj === "object") {
      blacklist.map(prop => delete obj[prop]);
      return obj;
    } else{
      return obj;
    }
  }
  
  // Converts from object literal to html syntax
  convert(obj) {
    if(typeof obj !== "object") {
      return obj;
    } else if(obj.constructor === Array) {
      return obj.map(elem => <tr><td>{this.convert(elem)}</td></tr>);
    } else {
      return Object.keys(obj).map(key => <tr><td>{key}</td> <td>{this.convert(obj[key])}</td> </tr>);
    }
  }

  range(n) {
    const temp = [];
    for(var i = 0; i < n; i++) {
      temp[i] = i;
    }
    return temp;
  }

  getCurrMods() {
    var currmods = [];
      for(var year in this.state.yourmods) {
        currmods = currmods.concat(this.state.yourmods[year]["Sem 1"].concat(this.state.yourmods[year]["Sem 2"]));
      }
    return currmods;
  }

  checkDuplicates(mod, currmods) {
    return currmods.filter(currmod => currmod === mod).length > 0;
  }
  
  parse(obj, currmods) {
    if(typeof obj !== "object") {
      return currmods.indexOf(obj) >= 0;
    } else {
      const or = obj.or == null ? true : obj.or.reduce((acc, elem) => acc || this.parse(elem, currmods), false);
      const and = obj.and == null ? true : obj.and.reduce((acc, elem) => acc && this.parse(elem, currmods), true);
      return or && and;
    }
  }

  checkPreclusion(currmods) {
    const preclusions = this.state.info.ParsedPreclusion;
    return preclusions == null ? false : this.parse(preclusions, currmods);
  }
  
  checkPrereqs(currmods) {
    const prereqs = this.state.info.ParsedPrerequisite;
    return prereqs == null ? true : this.parse(prereqs, currmods);
  }

  handleClick(event) {
    if(event.target.type === "submit") {
      // If submit button is clicked
      if(this.state.info == null) {
        this.setState({error: "No mod selected"});
        return undefined;
      }

      const temp = this.state.yourmods;
      const mod = this.state.info.ModuleCode;
      const year = this.state.year;
      const sem = "Sem " + this.state.sem;
      const currmods = this.getCurrMods();

      // Checks for terminating conditions
      if(this.checkDuplicates(mod, currmods)) {
        this.setState({error: "No duplicates"});
        return undefined;
      } else if(this.checkPreclusion(currmods)) {
        this.setState({error: "Already precluded"});
        return undefined;
      } else if(!this.checkPrereqs(currmods)) {
        this.setState({error: "Lack prerequisites"});
        return undefined;
      }
      
      // Adds mod to yourmods
      if(temp[year] === undefined) {
        temp[year] = {"Sem 1": [], "Sem 2": []};
      }
      temp[year][sem] = temp[year][sem].concat([mod]);
      
      // Updates yourmods, mcs, and clears error
      this.setState((state, props) => ({
        yourmods: temp,
        mcs: state.mcs + parseInt(state.info.ModuleCredit),
        error: ""
      })); 
    } else if(event.target.tagName === "OPTION") {
      // If option is clicked, identify the element id
      const parent = event.target.parentNode.id
      if(parent === "select-sem") {
        this.setState({sem: event.target.value});
      } else if(parent === "select-year") {
        this.setState({year: event.target.value});
      }
    }
  }

  handleChange(event) {
    const value = event.target.value.toUpperCase();
    const modcodes = this.state.modules.map(mod => mod["ModuleCode"]);
    const results = (value === "") ? [] : modcodes.filter(mod => RegExp(value + '+').test(mod)).slice(0,10);
    if(event.target.name === "name") {
      this.setState({
        value: value,
        autocomplete: results
      });
    }
  }

  handleSubmit(event) {
    const url = `https://api.nusmods.com/${this.state.year}/modules/${this.state.value}.json`;
    console.log(url);
    axios.get(url)
    .then((response) => {
      this.setState({
        info: response.data
      });
    })
    .catch((error) => {
      // handle error
      console.log(error);
      this.setState({
        info: {},
        error: "Could not find module"
      });
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

  render() {
    
    
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
            Semester: 
            <select id="select-sem" onClick={this.handleClick}>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
            Year:
            <select id="select-year" onClick={this.handleClick}>
              {this.range(19).map(i => (<option value={(i + 2000) +  "-" + (i + 2001)}>{(i + 2000) +  "-" + (i + 2001)}</option>))}
            </select>
            <br/>
            <span style={{color: "red"}}>{this.state.error}</span>
            {this.state.autocomplete.map(result => <p>{result}</p>)}
          </form>
          {this.convert(this.filterObjProps(["ModmavenTree", "History", "Timetable", "LecturePeriods", "TutorialPeriods", "CorsBiddingStats", "Workload"],
                                           this.state.info))}
        </div>
      </div>
    );
  }
}

export default App;
