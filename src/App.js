import React, { Component } from "react";
import "./App.css";
import "./SearchBar.js";
import SearchBar from "./SearchBar.js";
const axios = require("axios");

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
  constructor() {
    super();
    this.state = {
      mod: "",
      result: undefined, // state of search result
      preReqTree: {}, // contains preReqTree obj
      history: [], // contains history of searched modules
      yourmods: {}, // contains scheduled modules
      mcs: 0
    };
  }

  // Gets rid of unwanted object properties
  filterObjProps = (blacklist, obj) => {
    if (typeof obj === "object") {
      // Makes a copy of the object and modifies it
      const temp = JSON.parse(JSON.stringify(obj));
      blacklist.map(prop => delete temp[prop]);
      return temp;
    } else {
      return obj;
    }
  };

  // Converts object to html
  convertObj = obj => {
    if (typeof obj !== "object") {
      return obj;
    } else if (obj.constructor === Array) {
      return obj.map(elem => {
        return this.convertObj(elem);
      });
    } else {
      return Object.keys(obj).map(key => (
        <table key={key}>
          <tbody>
            <tr>
              <td>{key}</td>
              <td>{this.convertObj(obj[key])}</td>
            </tr>
          </tbody>
        </table>
      ));
    }
  };

  // Converts a plan object into html
  makePlan = (obj, props) => {
    if (obj.constructor === Array) {
      return obj.map(elem => (
        <tr>
          <td>
            <button
              onClick={() =>
                this.delMod(elem.name, elem.mcs, props[1], props[0])
              }
            >
              {elem.name}
            </button>
          </td>
        </tr>
      ));
    } else {
      return Object.keys(obj).map(key => (
        <tr>
          <td>{key}</td>
          <td>{this.makePlan(obj[key], props.concat([key]))}</td>
        </tr>
      ));
    }
  };

  getCurrMods = () => {
    var currmods = [];
    for (var year in this.state.yourmods) {
      const first = this.state.yourmods[year]["Sem 1"].map(mod => mod.name);
      const second = this.state.yourmods[year]["Sem 2"].map(mod => mod.name);
      currmods = currmods.concat(first.concat(second));
    }
    return currmods;
  };

  searchMods = mod => {
    this.setState({
      mod: mod
    });
  };

  // Parses boolTree objs to return a html tree
  modMavenTree = obj => {
    if (typeof obj !== "object") {
      return (
        <button key={obj} onClick={() => this.searchMods(obj)}>
          {obj}
        </button>
      );
    } else if (obj.constructor === Array) {
      return obj.map(mod => this.modMavenTree(mod));
    } else {
      const replace = key =>
        key === "or" ? "Either of" : key === "and" ? "All of" : key;
      return Object.keys(obj).map(key => (
        <table key={key}>
          <tbody>
            <tr>
              <td>{replace(key)}</td>
              <td>{this.modMavenTree(obj[key])}</td>
            </tr>
          </tbody>
        </table>
      ));
    }
  };

  // IN-PROGRESS
  // Builds entire prereq tree and updates state
  buildPreReqTree = () => {
    const mod = this.state.result.ModuleCode;
    const year = this.state.year;

    const getPrereqs = mod => {
      if (mod === undefined) {
        return undefined;
      }

      const url = `https://api.nusmods.com/${year}/modules/${mod}.json`;

      return axios
        .get(url)
        .then(response => response.ParsedPrerequisite)
        .catch(error => {
          return undefined;
        });
    };

    const buildTree = mod => {
      return getPrereqs(mod).then(prTree => {
        console.log(prTree);
        if (prTree !== undefined) {
          // iterates on bool operator keys "or" and "and"
          return Promise.all(
            Object.keys(prTree).map(boolOp => {
              return Promise.all(prTree[boolOp].map(this.buildTree)).then(
                prArray => {
                  prTree[boolOp] = prArray;
                }
              );
            })
          )
            .then(result => {
              prTree["mod"] = mod;
              console.log(prTree);
            })
            .resolve(prTree);
        } else {
          return mod;
        }
      });
    };

    buildTree(mod).then(result => {
      this.setState({
        preReqTree: result
      });
    });
  };

  // Parses boolTree objs to return a bool value(prerequisites, preclusions)
  parseBoolTree = (obj, currmods) => {
    if (typeof obj !== "object") {
      return currmods.indexOf(obj) >= 0;
    } else {
      console.log(obj);
      const or =
        obj.or == null
          ? true
          : obj.or.reduce(
              (acc, elem) => acc || this.parseBoolTree(elem, currmods),
              false
            );
      const and =
        obj.and == null
          ? true
          : obj.and.reduce(
              (acc, elem) => acc && this.parseBoolTree(elem, currmods),
              true
            );
      console.log(or, and);
      return or && and;
    }
  };

  checkPreclusion = currmods => {
    if (
      this.state.result === undefined ||
      this.state.result.ParsedPreclusion === undefined
    )
      return false;
    else
      return this.parseBoolTree(this.state.result.ParsedPreclusion, currmods);
  };

  checkPrereqs = currmods => {
    console.log(this.state.result);
    if (
      this.state.result === undefined ||
      this.state.result.ParsedPrerequisite === undefined
    )
      return true;
    else
      return this.parseBoolTree(this.state.result.ParsedPrerequisite, currmods);
  };

  checkDuplicates = (mod, currmods) => {
    return currmods.filter(currmod => currmod === mod).length > 0;
  };

  addMod = (mod, sem, year) => {
    const currmods = this.getCurrMods();
    const temp = JSON.parse(JSON.stringify(this.state.yourmods));
    console.log("test0");
    // Checks for terminating conditions
    if (this.checkDuplicates(mod, currmods)) {
      this.setState({ error: "No duplicates" });
      console.log("test1");
      return undefined;
    } else if (this.checkPreclusion(currmods)) {
      this.setState({ error: "Already precluded" });
      console.log("test2");
      return undefined;
    } else if (!this.checkPrereqs(currmods)) {
      this.setState({ error: "Lack prerequisites" });
      console.log("test3");
      return undefined;
    }

    console.log("test");
    if (this.state.result !== undefined) {
      if (temp[year] === undefined) {
        temp[year] = { "Sem 1": [], "Sem 2": [] };
      }
      temp[year][sem] = temp[year][sem].concat([
        { name: mod, mcs: this.state.result.ModuleCredit }
      ]);
    }

    // Updates yourmods, mcs, and clears error
    const newMcs =
      this.state.result === undefined
        ? 0
        : parseInt(this.state.result.ModuleCredit);
    console.log(temp, newMcs);
    this.setState(state => ({
      yourmods: temp,
      mcs: state.mcs + newMcs,
      error: ""
    }));
  };

  delMod = (mod, mcs, sem, year) => {
    const temp = JSON.parse(JSON.stringify(this.state.yourmods));
    temp[year][sem] = temp[year][sem].filter(elem => elem.name !== mod);
    this.setState((state, props) => ({
      yourmods: temp,
      mcs: state.mcs - mcs
    }));
  };

  updateResult = result => {
    this.setState(state => ({
      result: result
    }));
  };

  updateHistory = mod => {
    this.setState(state => ({
      history: state.history.concat([mod]).slice(-10)
    }));
  };

  // PLEASE DELETE
  componentDidUpdate = () => {
    console.log(this.state);
  };

  render() {
    const unwantedProps = [
      "LockedModules",
      "ParsedPreclusion",
      "ParsedPrerequisite",
      "ModmavenTree",
      "History",
      "Timetable",
      "LecturePeriods",
      "TutorialPeriods",
      "CorsBiddingStats",
      "Workload"
    ];
    const mmTree =
      this.state.result !== undefined
        ? {
            Preclusions: this.state.result.ParsedPreclusion,
            Prerequisites: this.state.result.ParsedPrerequisite,
            "Needed by": this.state.result.LockedModules
          }
        : "";
    return (
      <div className="App">
        <div>
          Your Mods:
          {this.makePlan(this.state.yourmods, [])} <br />
          Your MCs: {this.state.mcs}
          <br />
        </div>
        <div>
          <SearchBar
            addMod={this.addMod}
            buildPreReqTree={this.buildPreReqTree}
            updateResult={this.updateResult}
            updateHistory={this.updateHistory}
            year={this.state.year}
            mod={this.state.mod}
          />
          {this.convertObj(
            this.filterObjProps(unwantedProps, this.state.result)
          )}
          {this.modMavenTree(mmTree)}
          {this.modMavenTree(this.state.preReqTree)}
        </div>
        <div>
          History:
          {this.state.history.map(result => (
            <p key={result} onClick={() => this.searchMods(result)}>
              {result}
            </p>
          ))}
        </div>
      </div>
    );
  }
}

export default App;
