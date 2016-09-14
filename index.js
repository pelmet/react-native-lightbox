// @flow
/**
 * react-native-lightbox
 */
import React from 'react';
import ReactNative, {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Dimensions,
    TouchableOpacity,
    ViewPagerAndroid,
    Platform,
    ActivityIndicator,
} from 'react-native';
import Image from 'react-native-transformable-image';

const { width, height } = Dimensions.get('window');

/**
 * Default styles
 * @type {StyleSheetPropType}
 */
const styles = StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
        position: 'relative',
    },

    wrapper: {
        backgroundColor: 'transparent',
    },

    slide: {
        backgroundColor: 'transparent',
    },

    pagination_x: {
        position: 'absolute',
        bottom: 25,
        left: 0,
        right: 0,
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },

    pagination_y: {
        position: 'absolute',
        right: 15,
        top: 0,
        bottom: 0,
        flexDirection: 'column',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },

    title: {
        height: 30,
        justifyContent: 'center',
        position: 'absolute',
        paddingLeft: 10,
        bottom: -30,
        left: 0,
        flexWrap: 'nowrap',
        width: 250,
        backgroundColor: 'transparent',
    },

    buttonWrapper: {
        backgroundColor: 'transparent',
        flexDirection: 'row',
        position: 'absolute',
        top: 0,
        left: 0,
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 10,
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    buttonText: {
        fontSize: 50,
        color: '#007aff',
        fontFamily: 'Arial',
    },
});

// missing `module.exports = exports['default'];` with babel6
// export default React.createClass({
export default class Gallery extends React.Component {

    /**
     * Props Validation
     * @type {Object}
     */
    static propTypes = {
        images: React.PropTypes.array.isRequired,
        horizontal: React.PropTypes.bool,
        style: View.propTypes.style,
        pagingEnabled: React.PropTypes.bool,
        showsHorizontalScrollIndicator: React.PropTypes.bool,
        showsVerticalScrollIndicator: React.PropTypes.bool,
        bounces: React.PropTypes.bool,
        scrollsToTop: React.PropTypes.bool,
        removeClippedSubviews: React.PropTypes.bool,
        automaticallyAdjustContentInsets: React.PropTypes.bool,
        showsPagination: React.PropTypes.bool,
        showsButtons: React.PropTypes.bool,
        loadMinimal: React.PropTypes.bool,
        loadMinimalSize: React.PropTypes.number,
        loop: React.PropTypes.bool,
        autoplay: React.PropTypes.bool,
        autoplayTimeout: React.PropTypes.number,
        autoplayDirection: React.PropTypes.bool,
        initialPage: React.PropTypes.number,
        renderPagination: React.PropTypes.func,
        renderedRows: React.PropTypes.func,
        onScrollBeginDrag: React.PropTypes.func,
        onMomentumScrollEnd: React.PropTypes.func,
        dot: React.PropTypes.func,
        activeDot: React.PropTypes.func,
        nextButton: React.PropTypes.func,
        maxPaginationDots: React.PropTypes.number,
        paginationStyle: React.PropTypes.func,
        buttonWrapperStyle: React.PropTypes.func,
    }

    canChangeIndexByDrag = true;

    /**
     * Init states
     * @return {object} states
     */
    constructor(props) {
        super(props);
        this.state = this.initState(props);
    }

    /**
     * autoplay timer
     * @type {null}
     */
    autoplayTimer = null;

    componentDidMount() {
        this.autoplay();
    }

    initState(props) {
        const initState = {
            isScrolling: false,
            autoplayEnd: false,
            loopJump: false,
        };

        initState.total = props.images ? props.images.length || 1 : 0;
        initState.index = Math.min(props.initialPage, initState.total);

        // Default: horizontal
        initState.dir = props.horizontal === false ? 'y' : 'x';
        initState.width = props.width || width;
        initState.height = props.height || height;
        initState.offset = { };
        initState.image = props.images[initState.index];

        if (initState.total > 1) {
            let setup = initState.index;
            if (props.loop) {
                setup++;
            }
            initState.offset[initState.dir] = initState.dir === 'y'
                ? initState.height * setup
                : initState.width * setup;
        }

        return initState;
    }

    loopJump() {
        if (this.state.loopJump) {
            const i = this.state.index + (this.props.loop ? 1 : 0);
            setTimeout(() =>
            this.refs.scrollView.setPageWithoutAnimation &&
            this.refs.scrollView.setPageWithoutAnimation(i),
                50
        );
        }
    }

    /**
     * Automatic rolling
     */
    autoplay() {
        if (
            (this.props.images && this.props.images.length === 0)
            || !this.props.autoplay
            || this.state.isScrolling
            || this.state.autoplayEnd
        ) {
            return;
        }

        clearTimeout(this.autoplayTimer);

        this.autoplayTimer = setTimeout(() => {
            if (
                !this.props.loop && (
                    this.props.autoplayDirection
                    ? this.state.index === this.state.total - 1
                    : this.state.index === 0
                )
            ) {
                return this.setState({ autoplayEnd: true });
            }

            this.scrollBy(this.props.autoplayDirection ? 1 : -1);
        }, this.props.autoplayTimeout * 1000);
    }

    /**
     * Scroll begin handle
     * @param  {object} e native event
     */
    onScrollBegin = (e: Object) => {
        // update scroll state
        this.setState({ isScrolling: true });

        setTimeout(() => {
            if (this.props.onScrollBeginDrag) this.props.onScrollBeginDrag(e, this.state);
        });
    }

    /**
     * Scroll end handle
     * @param  {object} e native event
     */
    onScrollEnd = (e: Object) => {
        // update scroll state
        this.setState({
            isScrolling: false,
        });

        // making our events coming from android compatible to updateIndex logic
        if (!e.nativeEvent.contentOffset) {
            if (this.state.dir === 'x') {
                e.nativeEvent.contentOffset = { x: e.nativeEvent.position * this.state.width };
            } else {
                e.nativeEvent.contentOffset = { y: e.nativeEvent.position * this.state.height };
            }
        }

        this.updateIndex(e.nativeEvent.contentOffset, this.state.dir)

        // Note: `this.setState` is async, so I call the `onMomentumScrollEnd`
        // in setTimeout to ensure synchronous update `index`
        setTimeout(() => {
            this.autoplay();
            this.loopJump();

            // if `onMomentumScrollEnd` registered will be called here
            if (this.props.onMomentumScrollEnd) this.props.onMomentumScrollEnd(e, this.state, this);
        });
    }

    /*
     * Drag end handle
     * @param {object} e native event
     */
    onScrollEndDrag = (e: Object) => {
        const { contentOffset } = e.nativeEvent;
        const { horizontal } = this.props;
        const { offset, index } = this.state;
        const previousOffset = horizontal ? offset.x : offset.y;
        const newOffset = horizontal ? contentOffset.x : contentOffset.y;

        if (previousOffset === newOffset && (index === 0 || index === this.props.images.length - 1)) {
            this.setState({
                isScrolling: false,
            });
        }
    }

    /**
     * Scroll by index
     * @param  {number} index offset index
     */
    scrollBy(index: Number) {
        if (this.state.isScrolling || this.state.total < 2) return;
        const state = this.state;
        const diff = (this.props.loop ? 1 : 0) + index + this.state.index;
        let x = 0;
        let y = 0;
        if (state.dir === 'x') x = diff * state.width;
        if (state.dir === 'y') y = diff * state.height;

        if (Platform.OS === 'android') {
            if (this.refs.scrollView) this.refs.scrollView.setPage(diff);
        } else {
            if (this.refs.scrollView) this.refs.scrollView.scrollTo({ x, y });
        }

        // update scroll state
        this.setState({
            isScrolling: true,
            autoplayEnd: false,
        });

        // trigger onScrollEnd manually in android
        if (Platform.OS === 'android') {
            setTimeout(() => {
                this.onScrollEnd({
                nativeEvent: {
                    position: diff,
                },
            });
        }, 0);
        }
    }

    /**
     * Update index after scroll
     * @param  {object} offset content offset
     * @param  {string} dir    'x' || 'y'
     */
    updateIndex(offset: Object, dir: String) {
        const state = this.state;
        let index = state.index;
        const diff = offset[dir] - state.offset[dir];
        const step = dir === 'x' ? state.width : state.height;
        let loopJump = false;

        // Do nothing if offset no change.
        if (!diff) return;

        // Note: if touch very very quickly and continuous,
        // the variation of `index` more than 1.
        // parseInt() ensures it's always an integer
        index = parseInt(index + Math.round(diff / step), 10);

        if (this.props.loop) {
            if (index <= -1) {
                index = state.total - 1;
                offset[dir] = step * state.total;
                loopJump = true;
            } else if (index >= state.total) {
                index = 0;
                offset[dir] = step;
                loopJump = true;
            }
        }

        this.setState({
            index,
            offset,
            loopJump,
        });
    }

    scrollViewPropOverrides() : Array {
        const props = this.props;
        const overrides = {};

        for(let prop in props) {
            // if(~scrollResponders.indexOf(prop)
            if (typeof props[prop] === 'function'
                && prop !== 'onMomentumScrollEnd'
                && prop !== 'renderPagination'
                && prop !== 'onScrollBeginDrag'
            ) {
                const originResponder = props[prop];
                overrides[prop] = (e) => originResponder(e, this.state, this);
            }
        }

        return overrides;
    }

    /**
     * Render pagination
     * @return {object} react-dom
     */
    renderPagination() : Object {
        // By default, dots only show when `total` > 2
        if (this.state.total <= 1 || this.state.total > this.props.maxPaginationDots) return null;

        let dots = [];
        const ActiveDot = this.props.activeDot ||
            <View
                style={{
                    backgroundColor: '#007aff',
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        marginLeft: 3,
                        marginRight: 3,
                        marginTop: 3,
                        marginBottom: 3,
                }}
            />;
        const Dot = this.props.dot ||
            <View
                style={{
                    backgroundColor: 'rgba(0,0,0,.2)',
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        marginLeft: 3,
                        marginRight: 3,
                        marginTop: 3,
                        marginBottom: 3,
                }}
            />;
        for (let i = 0; i < this.state.total; i++) {
            dots.push(i === this.state.index
                ?
                React.cloneElement(ActiveDot, { key: i })
                :
                React.cloneElement(Dot, { key: i })
            );
        }

        return (
            <View
                pointerEvents={'none'}
                style={[styles[`pagination_${this.state.dir}`], this.props.paginationStyle]}
            >
                {dots}
            </View>
        );
    }

    renderTitle() {
        /*
         let child = this.props.children[this.state.index]
         let title = child && child.props && child.props.title
         return title
         ? (
         <View style={styles.title}>
         {this.props.children[this.state.index].props.title}
         </View>
         )
         : null*/
    }

    renderNextButton() {
        let button;

        if (this.props.loop || this.state.index !== this.state.total - 1) {
            button = this.props.nextButton || <Text style={styles.buttonText}>›</Text>;
        }

        return (
            <TouchableOpacity onPress={() => button !== null && this.scrollBy.call(this, 1)}>
                <View>
                    {button}
                </View>
            </TouchableOpacity>
        );
    }

    renderPrevButton() {
        let button = null

        if (this.props.loop || this.state.index !== 0) {
            button = this.props.prevButton || <Text style={styles.buttonText}>‹</Text>;
        }

        return (
            <TouchableOpacity onPress={() => button !== null && this.scrollBy.call(this, -1)}>
                <View>
                    {button}
                </View>
            </TouchableOpacity>
        );
    }

    renderButtons() {
        return (
            <View
                pointerEvents={'box-none'}
                style={[
                    styles.buttonWrapper,
                    { width: this.state.width, height: this.state.height },
                    this.props.buttonWrapperStyle,
                ]}
            >
                {this.renderPrevButton()}
                {this.renderNextButton()}
            </View>
        );
    }

    renderScrollView(pages) {
        if (Platform.OS === 'ios') {
            return (
                <ScrollView
                    ref="scrollView"
                    {...this.props}
                    {...this.scrollViewPropOverrides()}
                    contentContainerStyle={[styles.wrapper, this.props.style]}
                    contentOffset={this.state.offset}
                    onScrollBeginDrag={(event: Object) => this.onScrollBegin(event)}
                    onMomentumScrollEnd={(event: Object) => this.onScrollEnd(event)}
                    onScrollEndDrag={(event: Object) => this.onScrollEndDrag(event)}
                >
                    {pages}
                </ScrollView>
            );
        }

        return (
            <ViewPagerAndroid
                ref="scrollView"
                {...this.props}
                initialPage={this.props.loop ? this.state.index + 1 : this.state.index}
                onPageSelected={(event: Object) => this.onScrollEnd(event)}
                style={{ flex: 1 }}
            >
                {pages}
             </ViewPagerAndroid>
        );
    }

    /**
     * Default render
     * @return {object} react-dom
     */
    render() : Object {
        const state = this.state;
        const props = this.props;
        const index = state.index;
        const total = this.props.images.length;
        const loop = props.loop;
        const loopVal = loop ? 1 : 0;

        let pages = [];

        let pageStyle = [{ width: state.width, height: state.height }, styles.slide];
        let pageStyleLoading = {
            width: this.state.width,
            height: this.state.height,
            justifyContent: 'center',
            alignItems: 'center',
        }

        this.state.image = this.props.images[index];

        // For make infinite at least total > 1
        if (total > 1) {
            // Re-design a loop model for avoid img flickering
            pages = [...this.props.images];

            if (loop && total) {
                pages.push(pages[0]);
                pages.unshift(pages[total - 1]);
            }

            pages = pages.map((page, i) => {
                if (props.loadMinimal) {
                    if (i >= (index + loopVal - props.loadMinimalSize) &&
                        i <= (index + loopVal + props.loadMinimalSize)) {
                        return this.renderPage(page, i);
                    } else {
                        return (
                            <View style={pageStyleLoading} key={`loading-${i}`}>
                                <ActivityIndicator />
                            </View>
                        );
                    }
                } else {
                    return this.renderPage(page, i);
                }
            });
        } else pages = <View style={pageStyle} />;

        return (
            <View
                style={[this.props.style, {
                    width: state.width,
                        height: state.height,
                }]}
            >
                {this.renderScrollView(pages)}
                {props.showsPagination && (props.renderPagination
                    ? this.props.renderPagination(state.index, state.total, this)
                    : this.renderPagination())}
                {this.renderTitle()}
                {this.props.showsButtons && this.renderButtons()}
            </View>
        );
    }


    renderPage(image: String, key = null) {
        return (
            <View
                style={[{ width: width, height: this.state.height }, styles.slide]}
                key={key || image + Math.random() * 10000}
            >
                {this.renderImage(image)}
            </View>
        );
    }

    renderImage(image: String) {
        return (
            <Image
                source={{ uri: image }}
                style={{ width, height }}
                onViewTransformed={(transform: Object) => this.onViewTransformed(transform)}
                onTransformGestureReleased={(transform: Object) => this.onTransformGestureReleased(transform)}
            />
        );
    }

    onViewTransformed = (transform) => {
        const { scale, translateX, translateY } = transform;
        const tresholdX = width / (7 / scale);
        const tresholdY = height * 0.5;

        if (Platform.OS === 'android' &&
            this.canChangeIndexByDrag &&
            !this.state.isScrolling &&
            Math.abs(translateX) > tresholdX &&
            Math.abs(translateY) < tresholdY &&
            scale >= 1
        ) {
            this.scrollBy.call(this, translateX > 0 ? -1 : 1);
            this.canChangeIndexByDrag = false;
        }
    }

    onTransformGestureReleased = (transform) => {
        this.canChangeIndexByDrag = true;
    }
}

Gallery.defaultProps = {
    horizontal: true,
    pagingEnabled: true,
    showsHorizontalScrollIndicator: false,
    showsVerticalScrollIndicator: false,
    bounces: false,
    scrollsToTop: false,
    removeClippedSubviews: true,
    automaticallyAdjustContentInsets: false,
    showsPagination: true,
    showsButtons: false,
    loop: true,
    loadMinimal: false,
    loadMinimalSize: 1,
    autoplay: false,
    autoplayTimeout: 2.5,
    autoplayDirection: true,
    index: 0,
    length: 0,
    maxPaginationDots: 20,
};
