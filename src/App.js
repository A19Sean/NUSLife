import React, { Component } from "react";
import "./App.css";
import "./SearchBar.js";
import SearchBar from "./SearchBar.js";
const axios = require("axios");

// TODO
// Check for mcs(overloading), basic requirements, mod mapping
// Other programmes besides mods eg SEP, UTCP
// Sort schedule chronologically
// Some bugs in the ParsedPrerequisite Tree: Should be "or" but instead it's "and" eg: MA1521, MA1102R
// Overload indicator
// Keyboard shortcuts
// Test for dead links
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
      mcs: 0,
      error: ""
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

  makeButton = (key, click, text) => (
    <button key={key} onClick={click}>
      {text}
    </button>
  );

  formatYear = year => {
    return year.replace("/", "-");
  };

  buildTreeButton = key => {
    if (key === "Prerequisites")
      return (
        <React.Fragment>
          <br />
          {this.makeButton(
            key,
            () =>
              this.buildPreReqTree(this.formatYear(this.state.result.AcadYear)),
            "Prerequisite Tree"
          )}
        </React.Fragment>
      );
  };

  makeTable = (key, fn) => (
    <table key={key}>
      <tbody>
        <tr>
          <td>
            {key}
            {this.buildTreeButton(key)}
          </td>
          <td>{fn}</td>
        </tr>
      </tbody>
    </table>
  );

  // Converts object to html
  convertObj = obj => {
    if (typeof obj !== "object") {
      return obj;
    } else if (obj.constructor === Array) {
      return obj.map(elem => {
        return this.convertObj(elem);
      });
    } else {
      return Object.keys(obj).map(key =>
        this.makeTable(key, this.convertObj(obj[key]))
      );
    }
  };

  // Converts a plan object into html
  makePlan = (obj, props) => {
    if (obj.constructor === Array) {
      return obj.map(elem =>
        this.makeButton(
          elem.name,
          () => this.delMod(elem.name, elem.mcs, props[1], props[0]),
          elem.name
        )
      );
    } else {
      return Object.keys(obj).map(key =>
        this.makeTable(key, this.makePlan(obj[key], props.concat([key])))
      );
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
    if (obj === undefined || obj === "") {
      return;
    }
    if (typeof obj !== "object") {
      return this.makeButton(obj, () => this.searchMods(obj), obj);
    }
    if (obj.constructor === Array) {
      return obj.map(mod => this.modMavenTree(mod));
    }
    const isMod = key =>
      [
        "Prerequisite Tree",
        "Either of",
        "All of",
        "Preclusions",
        "Prerequisites",
        "Needed by",
        "Only"
      ].indexOf(key) === -1;
    const replace = key => {
      if (key === "or") return "Any of";
      if (key === "and") return "All of";
      if (isMod(key))
        return this.makeButton(key, () => this.searchMods(key), key);
      return key;
    };
    return Object.keys(obj).map(key =>
      this.makeTable(replace(key), this.modMavenTree(obj[key]))
    );
  };

  // Builds entire prereq tree and updates state
  buildPreReqTree = year => {
    if (this.state.result === undefined) return;
    const mod = this.state.result.ModuleCode;
    const getPrereqs = mod => {
      if (mod === undefined) {
        return undefined;
      }

      const url = `https://api.nusmods.com/${year}/modules/${mod}.json`;

      return axios
        .get(url)
        .then(response => response.data.ParsedPrerequisite)
        .catch(error => {
          console.log(error);
          return undefined;
        });
    };

    const buildTree = node => {
      if (typeof node === "object") {
        // If node is a boolTree
        return Promise.all(
          Object.keys(node).map(boolOp =>
            buildTree(node[boolOp]).then(treeArray => {
              // An array of preReqTrees
              node[boolOp] = treeArray;
            })
          )
        ).then(result => node);
      } else if (node.constructor === Array) {
        // If node is an array of mods
        return Promise.all(node.map(buildTree));
      } else {
        // If node is a single mod
        return getPrereqs(node).then(boolTree => {
          if (boolTree === undefined) {
            // If mod has no prerequisites (Either mod does not exist or it is a foundational mod)
            return node;
          } else {
            if (typeof boolTree === "object") {
              return buildTree(boolTree).then(result => ({ [node]: result }));
            } else {
              // If there is only one prerequisite
              return buildTree(boolTree).then(result => ({
                [node]: { Only: result }
              }));
            }
          }
        });
      }
    };

    buildTree(mod).then(result => {
      const temp = { "Prerequisite Tree": result };
      this.setState({
        preReqTree: temp
      });
    });
  };

  // Parses boolTree objs to return a bool value(prerequisites, preclusions)
  parseBoolTree = (obj, currmods) => {
    if (typeof obj !== "object") {
      return currmods.indexOf(obj) >= 0;
    } else {
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
    // console.log(this.state.result);
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
    if (this.checkDuplicates(mod, currmods)) {
      this.setState({ error: "No duplicates" });
      return undefined;
    } else if (this.checkPreclusion(currmods)) {
      this.setState({ error: "Already precluded" });
      return undefined;
    } else if (!this.checkPrereqs(currmods)) {
      this.setState({ error: "Lack prerequisites" });
      return undefined;
    }

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
      history: [mod].concat(state.history).slice(0, 10)
    }));
  };

  updateError = error => {
    this.setState({ error: error });
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
            updateResult={this.updateResult}
            updateHistory={this.updateHistory}
            updateError={this.updateError}
            year={this.state.year}
            mod={this.state.mod}
            error={this.state.error}
          />
          {this.convertObj(
            this.filterObjProps(unwantedProps, this.state.result)
          )}
          {this.modMavenTree(mmTree)}
          {this.modMavenTree(this.state.preReqTree)}
        </div>
        <div>
          History:
          {this.state.history.map((result, index) => (
            <p key={index} onClick={() => this.searchMods(result)}>
              {result}
            </p>
          ))}
        </div>
      </div>
    );
  }
}

export default App;
