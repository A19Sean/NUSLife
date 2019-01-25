import React, { Component } from "react";
import axios from "axios";

import SearchBar from "./SearchBar";
import StudentPlan from "./StudentPlan";

import "./App.css";

// DONE
// tags and sharing, preclusions as prereqs
// Add grade calculation
// Improve overload

// TODO
// Check for basic requirements, mod mapping
// Other programmes besides mods eg SEP, UTCP
// Some bugs in the ParsedPrerequisite Tree: Should be "or" but instead it's "and" eg: MA1521, MA1102R
// Bug: Mods that are not explicitly stated as prereqs but are preclusions do not function as prereqs
// Keyboard shortcuts
// Tags and sharing

class App extends Component {
  constructor() {
    super();
    this.state = {
      mod: "",
      result: undefined, // state of search result
      preReqTree: {}, // contains preReqTree obj
      history: [], // contains history of searched modules
      studentMods: {}, // contains scheduled modules
      mcs: 0,
      error: ""
    };
  }

  setAppState = (key, value) => {
    this.setState({
      [key]: value
    });
  };

  copyObj = obj => JSON.parse(JSON.stringify(obj));

  // Gets rid of unwanted object properties
  filterObjProps = (blacklist, obj) => {
    if (typeof obj === "object") {
      const temp = this.copyObj(obj);
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

  // Converts object to html table
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

  isValInArr = (val, arr) => arr.find(elem => elem === val) !== undefined;

  initMod = (mod, mcs, grade) => ({ Name: mod, MCs: mcs, Grade: grade });
  initSem = () => ({ Mods: [], Overload: false });
  initYear = () => ({ "Sem 1": this.initSem(), "Sem 2": this.initSem() });

  getYears = plan => Object.keys(plan);
  getYear = (plan, year) => plan[year];
  getSem = (plan, year, sem) => this.getYear(plan, year)[sem];
  getOverload = (plan, year, sem) => this.getSem(plan, year, sem)["Overload"];
  getMods = (plan, year, sem) => this.getSem(plan, year, sem)["Mods"];

  getName = mod => mod["Name"];
  getMCs = mod => mod["MCs"];
  getGrade = mod => mod["Grade"];

  setMods = (plan, year, sem, mods) => {
    const temp = this.copyObj(plan);
    temp[year][sem]["Mods"] = mods;
    return temp;
  };
  setSem = (plan, year, sem, obj) => {
    const temp = this.copyObj(plan);
    temp[year][sem] = obj;
    return temp;
  };
  setYear = (plan, year, obj) => {
    const temp = this.copyObj(plan);
    temp[year] = obj;
    return temp;
  };
  setOverload = (plan, year, sem) => {
    const temp = this.copyObj(plan);
    temp[year][sem]["Overload"] = !temp[year][sem]["Overload"];
    return temp;
  };

  addMod = (mod, sem, year) => {
    if (this.state.result === undefined) {
      this.updateError("No mod selected");
      return undefined;
    }

    // Returns an array of mods up to a specified academic year and semester
    const getCurrMods = (sem = "Sem 2", maxYear = "9999-9999") => {
      const getModsInYear = year => {
        const plan = this.state.studentMods;
        if (year < maxYear || (year === maxYear && sem === "Sem 2")) {
          const first = this.getMods(plan, year, "Sem 1").map(this.getName);
          const second = this.getMods(plan, year, "Sem 2").map(this.getName);
          return first.concat(second);
        } else if (year === maxYear && sem === "Sem 1") {
          return this.getMods(plan, year, "Sem 1").map(this.getName);
        } else {
          return [];
        }
      };

      const currmods = this.getYears(this.state.studentMods)
        .map(getModsInYear)
        .reduce((acc, arr) => acc.concat(arr), []);

      return currmods;
    };

    // Parses boolTree objs to return a bool value(prerequisites, preclusions)
    const parseBoolTree = (obj, currmods, isCheckPrereq = false) => {
      if (typeof obj !== "object") {
        return this.isValInArr(obj, currmods);
      } else {
        const or =
          obj.or == null
            ? true
            : obj.or.reduce(
                (acc, elem) => acc || parseBoolTree(elem, currmods),
                false
              );
        const and =
          obj.and == null
            ? true
            : obj.and.reduce(
                (acc, elem) => acc && parseBoolTree(elem, currmods),
                true
              );
        return or && and;
      }
    };

    const checkPreclusion = currmods => {
      if (this.state.result.ParsedPreclusion === undefined) return false;
      else return parseBoolTree(this.state.result.ParsedPreclusion, currmods);
    };

    const checkPrereqs = currmods => {
      if (this.state.result.ParsedPrerequisite === undefined) return true;
      else
        return parseBoolTree(
          this.state.result.ParsedPrerequisite,
          currmods,
          true
        );
    };

    const checkDuplicates = currmods => {
      return this.isValInArr(mod, currmods);
    };

    const checkOverload = () => {
      if (this.getYear(this.state.studentMods, year) === undefined) {
        return 0;
      } else {
        const mild = 24;
        const overload = 32;
        const total = this.getMods(this.state.studentMods, year, sem)
          .map(mod => parseInt(this.getMCs(mod)))
          .reduce((acc, mcs) => acc + mcs, 0);
        return total >= overload ? 2 : total >= mild ? 1 : 0;
      }
    };

    if (checkDuplicates(getCurrMods())) {
      this.updateError("No duplicates");
      return undefined;
    }
    if (checkPreclusion(getCurrMods())) {
      this.updateError("Already precluded");
      return undefined;
    }
    if (!checkPrereqs(getCurrMods(sem, year))) {
      this.updateError("Lack prerequisites");
      return undefined;
    }
    if (checkOverload() > 0) {
      const value = checkOverload();
      // Overflows mod
      const isOverload = this.getOverload(this.state.studentMods, year, sem);
      if (value === 2 && !isOverload) {
        this.updateError("Overload!");
        // Increments year, sem
        const yearInt = parseInt(year.slice(0, 4));
        year = sem === "Sem 1" ? year : yearInt + 1 + "-" + (yearInt + 2);
        sem = sem === "Sem 1" ? "Sem 2" : "Sem 1";
        // Added mod overflows to the next sem
        this.addMod(mod, sem, year);
        return undefined;
      } else if (value === 1) {
        this.updateError(
          "Not recommended to take more than 24MCs per semester"
        );
      }
    }

    var temp = this.copyObj(this.state.studentMods);
    if (this.getYear(this.state.studentMods, year) === undefined) {
      temp = this.setYear(temp, year, this.initYear());
    }
    var newMods = this.getMods(temp, year, sem).concat(
      this.initMod(mod, this.state.result.ModuleCredit, 5.0)
    );
    temp = this.setMods(temp, year, sem, newMods);

    // Updates studentMods, mcs
    const newMcs = parseInt(this.state.result.ModuleCredit);
    this.setState(state => ({
      studentMods: temp,
      mcs: state.mcs + newMcs
    }));
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
      !this.isValInArr(key, [
        "Prerequisite Tree",
        "Either of",
        "All of",
        "Preclusions",
        "Prerequisites",
        "Needed by",
        "Only"
      ]);
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
        return this.getPrerequisites(year, node).then(boolTree => {
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

  getPrerequisites = (year, mod) => {
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

  getPreclusions = (year, mod) => {
    if (mod === undefined) {
      return undefined;
    }

    const url = `https://api.nusmods.com/${year}/modules/${mod}.json`;

    return axios
      .get(url)
      .then(response => response.data.ParsedPreclusion)
      .catch(error => {
        console.log(error);
        return undefined;
      });
  };

  searchMods = mod => {
    this.setState({
      mod: mod
    });
  };

  updateOverload = (year, sem) => {
    const temp = this.setOverload(this.state.studentMods, year, sem);
    this.setState({
      studentMods: temp
    });
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

  handleKeyInput = event => {
    // console.log(event.key);
  };

  render() {
    console.log(this.state.studentMods);
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
      "Workload",
      "Prerequisite",
      "Preclusion"
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
      <div className="App" onKeyDown={this.handleKeyInput}>
        <StudentPlan
          copyObj={this.copyObj}
          getMods={this.getMods}
          getOverload={this.getOverload}
          getYears={this.getYears}
          makeButton={this.makeButton}
          makeTable={this.makeTable}
          mcs={this.state.mcs}
          setAppState={this.setAppState}
          setMods={this.setMods}
          studentMods={this.state.studentMods}
        />
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
