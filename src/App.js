import React, { Component } from 'react';
import './App.css';
const axios = require('axios');

// TODO
// Check for prereqs, preclusion, mcs(overloading), basic requirements, mod mapping
// Other programmes besides mods eg SEP, UTCP
// Sort schedule chronologically
// Some bugs in the ParsedPrerequisite Tree: Should be or but instead it's and eg: MA1521, MA1102R
// Overload indicator
// Keyboard shortcuts
// Test for dead links
// Build entire prereq tree from top down
// Tags and sharing

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {value: 'Search', // state of search bar
                  sem: '1',
                  year: '2018-2019',
                  modules: [], // stores all modules
                  info: undefined, // state of search result
                  preReqTree: {}, // contains preReqTree obj
                  history: [], // contains history of searched modules
                  yourmods: {}, // contains scheduled modules
                  mcs: 0,
                  autocomplete: [], // state of autocomplete suggestions
                  error: "" // displays all errors
                };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.selectSem = this.selectSem.bind(this);
    this.selectYear = this.selectYear.bind(this);
    this.preReqTree = this.preReqTree.bind(this);
  }

  range(n) {
    const temp = [];
    for(var i = 0; i < n; i++) {
      temp[i] = i;
    }
    return temp;
  }

  // Gets rid of unwanted object properties
  filterObjProps(blacklist, obj) {    
    if(typeof obj === "object") {
      // Makes a copy of the object and modifies it
      const temp = JSON.parse(JSON.stringify(obj));
      blacklist.map(prop => delete temp[prop]);
      return temp;
    } else{
      return obj;
    }
  }
  
  // Converts from object literal to html
  convert(obj) {
    if(typeof obj !== "object") {
      return obj;
    } else if(obj.constructor === Array) {
      return obj.map(elem => <tr><td>{this.convert(elem)}</td></tr>);
    } else {
      return Object.keys(obj).map(key => <tr><td>{key}</td> <td>{this.convert(obj[key])}</td> </tr>);
    }
  }

  // Converts a plan object into html
  makePlan(obj, props) {
    if(obj.constructor === Array) {
      return obj.map(elem => <tr><td><button onClick={() => this.delMod(elem.name, elem.mcs, props[1], props[0])}>{elem.name}</button></td></tr>);
    } else {
      return Object.keys(obj).map(key => <tr><td>{key}</td> <td>{this.makePlan(obj[key], props.concat([key]))}</td> </tr>);
    }
  }

  getCurrMods() {
    var currmods = [];
      for(var year in this.state.yourmods) {
        const first = this.state.yourmods[year]["Sem 1"].map(mod => mod.name);
        const second = this.state.yourmods[year]["Sem 2"].map(mod => mod.name);
        currmods = currmods.concat(first.concat(second));
      }
    return currmods;
  }

  search(year, mod){
    const url = `https://api.nusmods.com/${year}/modules/${mod}.json`;
    console.log(url);
    axios.get(url)
    .then((response) => {
      this.setState((state, props) => ({
        value: mod,
        year: year,
        info: response.data,
        autocomplete: [],
        history: state.history.concat([mod]).slice(-10)
      }));
    })
    .catch((error) => {
      // handle error
      console.log(error);
      this.setState({
        info: undefined,
        error: "Could not find module"
      });
    });
  }

  // Parses boolTree objs to return a html tree
  modMavenTree(obj) {
    if(typeof obj !== "object") {
      return <tr><td><button onClick={() => this.search(this.state.year, obj)}>{obj}</button></td></tr>;
    } else if(obj.constructor === Array) {
      return obj.map(mod => this.modMavenTree(mod));
    } else {
      const replace = key => (key === "or" ? "Either of" : key === "and" ? "All of" : key);
      return Object.keys(obj).map(key => <tr><td>{replace(key)}</td> <td>{this.modMavenTree(obj[key])}</td> </tr>);
    }
  }

  // Builds entire prereq tree and updates state
  preReqTree() {
    const mod = this.state.info.ModuleCode;
    const year = this.state.year;

    function getPrereqs(mod) {
      if(mod === undefined) {
        return undefined;
      }
      
      const url = `https://api.nusmods.com/${year}/modules/${mod}.json`;
      
      return axios.get(url)
      .then(response => response.ParsedPrerequisite)
      .catch((error) => {
        return undefined;
      });
    }
    
    function buildTree(mod) {
      return getPrereqs(mod)
      .then(prTree => {
        console.log(prTree);
        if(prTree !== undefined) {
          // iterates on bool operator keys "or" and "and"
          return Promise.all(Object.keys(prTree).map(boolOp => {
            Promise.all(prTree[boolOp].map(this.buildTree))
            .then(prArray => {
              prTree[boolOp] = prArray;
            });
          }))
          .then(result => {
            prTree["mod"] = mod;
            console.log(prTree);
          })
          .resolve(prTree);
        } else{
          return mod;
        }
      });
    }

    buildTree(mod)
    .then(result => {
      this.setState({
        preReqTree: result
      });
    });
  }

  // Parses boolTree objs to return a bool value(prerequisites, preclusions)
  parseBoolTree(obj, currmods) {
    if(typeof obj !== "object") {
      return currmods.indexOf(obj) >= 0;
    } else {
      const or = obj.or == null ? true : obj.or.reduce((acc, elem) => acc || this.parseBoolTree(elem, currmods), false);
      const and = obj.and == null ? true : obj.and.reduce((acc, elem) => acc && this.parseBoolTree(elem, currmods), true);
      return or && and;
    }
  }

  checkPreclusion(currmods) {
    const preclusions = this.state.info.ParsedPreclusion;
    return preclusions == null ? false : this.parseBoolTree(preclusions, currmods);
  }
  
  checkPrereqs(currmods) {
    const prereqs = this.state.info.ParsedPrerequisite;
    return prereqs == null ? true : this.parseBoolTree(prereqs, currmods);
  }

  checkDuplicates(mod, currmods) {
    return currmods.filter(currmod => currmod === mod).length > 0;
  }

  addMod(mod, sem, year) {
    const currmods = this.getCurrMods();
    const temp = JSON.parse(JSON.stringify(this.state.yourmods));
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

    if(temp[year] === undefined) {
      temp[year] = {"Sem 1": [], "Sem 2": []};
    }
    temp[year][sem] = temp[year][sem].concat([{"name": mod, "mcs": this.state.info.ModuleCredit}]);
    
    // Updates yourmods, mcs, and clears error
    this.setState((state, props) => ({
      yourmods: temp,
      mcs: state.mcs + parseInt(state.info.ModuleCredit),
      error: ""
    })); 
  }

  delMod(mod, mcs, sem, year) {
    const temp = JSON.parse(JSON.stringify(this.state.yourmods));
    temp[year][sem] = temp[year][sem].filter(elem => elem.name !== mod);
    this.setState((state, props) => ({
      yourmods: temp,
      mcs: state.mcs - mcs
    }));
  }

  selectSem(event) {
    this.setState({sem: event.target.value});
  }
    
  selectYear(event) {
    this.setState({year: event.target.value});
    axios.get(`https://api.nusmods.com/${event.target.value}/moduleList.json`)
    .then((response) => {
      this.setState({
        modules: response.data
      })
    });
  }

  handleClick(event) {
    if(event.target.type === "submit") {
      // If submit button is clicked
      if(this.state.info == null) {
        this.setState({error: "No mod selected"});
        return undefined;
      }
      const year = this.state.year;
      const sem = "Sem " + this.state.sem;
      const mod = this.state.info.ModuleCode;
      
      this.addMod(mod, sem, year);
    } 
  }

  handleChange(event) {
    const value = event.target.value.toUpperCase();
    const modcodes = this.state.modules.map(mod => mod["ModuleCode"]);
    const results = (value === "") ? [] : modcodes.filter(mod => RegExp(value + '+').test(mod)).slice(0,10);
    this.setState({
      value: value,
      autocomplete: results
    });
  }

  handleSubmit(event) {
    event.preventDefault();
    this.search(this.state.year, this.state.value);
  }
  
  componentDidMount() {
    axios.get(`https://api.nusmods.com/${this.state.year}/moduleList.json`)
    .then((response) => {
      this.setState({
        modules: response.data
      })
    });
  }

  render() {
    const unwantedProps = ["LockedModules", "ParsedPreclusion", "ParsedPrerequisite", "ModmavenTree", "History", "Timetable", "LecturePeriods", "TutorialPeriods", "CorsBiddingStats", "Workload"];
    const mmTree = this.state.info !== undefined 
                      ? {"Preclusions": this.state.info.ParsedPreclusion,
                        "Prerequisites": this.state.info.ParsedPrerequisite,
                        "Needed by": this.state.info.LockedModules} : "";
    return (
      <div className="App">
        <div>
          Your Mods: 
          {this.makePlan(this.state.yourmods, [])} <br/>
          Your MCs: {this.state.mcs}<br/>
        </div>
        <div>
          <form onSubmit={this.handleSubmit}>
            Module Code:
            <input type="text" name="name" value={this.state.value} onChange={this.handleChange}/>
            <input type="submit" value="Search" />
            <button id="add-mod" onClick={this.handleClick}>Add Module</button> <br/>
           {this.state.info !== undefined 
              ? <button id="build-tree" onClick={this.preReqTree}>Build Tree</button>
              : ""} <br/>
            Semester: 
            <select id="select-sem" onClick={this.selectSem}>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
            Year:
            <select id="select-year" onClick={this.selectYear}>
              {this.range(20).map(i => (<option value={(i + 2000) +  "-" + (i + 2001)}>{(i + 2000) +  "-" + (i + 2001)}</option>))}
            </select>
            <br/>
            <span style={{color: "red"}}>{this.state.error}</span>
            {this.state.autocomplete.map(result => <p onClick={() => this.search(this.state.year, result)}>{result}</p>)}
          </form>
          {this.convert(this.filterObjProps(unwantedProps,
                                           this.state.info))}
          {this.modMavenTree(mmTree)}
          {this.modMavenTree(this.state.preReqTree)}
        </div>
        <div>
          History:
          {this.state.history.map(result => <p onClick={() => this.search(this.state.year, result)}>{result}</p>)}
        </div>
      </div>
    );
  }
}

export default App;
